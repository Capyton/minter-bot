// TODO: Remove when file flows are ready to use
/* eslint-disable @typescript-eslint/no-unused-vars */
import path from 'path';
import { randomUUID } from 'crypto';
import { InlineKeyboard } from 'grammy';
import { hydrate } from '@grammyjs/hydrate';

import { Address } from 'ton-core';
import { Context, Conversation } from '@/types';
import { downloadFile } from '@/utils/files';
import { mintCollection, mintItems } from '@/utils/mintCollection';
import {
  baseFlowMenu,
  cancelMenu,
  confirmMintingMenu,
  transactionSentMenu,
  transferTONMenu,
} from '@/menus';
import { openWallet } from '@/utils/wallet';
import { createCollectionMetadata, createMetadataFile } from '@/utils/metadata';
import { NftCollection } from '@/contracts/NftCollection';
import { isAddress } from '@/utils/address';
import { getAddresses } from './getAddresses';
import { newItem } from './newItem';

export const messageTemplate = (
  entity: string,
  name: string,
  description: string,
  addresses: Address[] | undefined = undefined
) => {
  let text = `
<b>${entity} name:</b> ${name}.
<b>${entity} description:</b>\n${description}\n\n`;

  if (addresses) {
    text += `<b>Addresses:</b> ${addresses.join(', ')}`;
  }
  return text;
};

const getAddress = async (
  ctx: Context,
  conversation: Conversation
): Promise<Address> => {
  const enterCollectionAddrMsg = await ctx.reply('Enter collection address: ', {
    reply_markup: cancelMenu,
  });

  const collection = await conversation.waitFor(':text');
  const wallet = await openWallet(
    process.env.MNEMONIC!.split(' '),
    Boolean(process.env.TESTNET!)
  );
  if (
    !isAddress(collection.message!.text) ||
    !(await NftCollection.isOwner(
      Address.parse(collection.message!.text),
      wallet.contract.address
    ))
  ) {
    await ctx.reply(
      'Check the correctness of the entered address and try again.'
    );
    return await getAddress(ctx, conversation);
  }

  await enterCollectionAddrMsg.delete();
  return Address.parse(collection.message!.text);
};

const getImage = async (
  entity: string,
  conversation: Conversation,
  ctx: Context,
  collectionImage?: Context
): Promise<Context> => {
  const image = await conversation.wait();

  if (image.callbackQuery?.data === 'collection-as-cover' && collectionImage) {
    await image.callbackQuery.message?.delete();

    await ctx.reply(
      "Collection's cover image will be the same as the collection image"
    );

    return collectionImage;
  }

  if (image.message?.photo) {
    return image;
  }

  await ctx.reply(`${entity} image must be an image`);

  return await getImage(entity, conversation, ctx, collectionImage);
};

export const newCollection = async (
  conversation: Conversation,
  ctx: Context
) => {
  await conversation.run(hydrate());

  await ctx.editMessageText(
    "Upload collection's image:\n\nRecommended image size: a square between 400x400 and 1000x1000 pixels.\nRecommended format: png, jpg, webp, svg.",
    { reply_markup: cancelMenu }
  );
  const image = await getImage('Collection', conversation, ctx);

  await ctx.reply(
    "Upload the collection's cover image:\n\nRecommended image size: 2880x680 pixels.\nRecommended format: png, jpg, webp, svg.",
    {
      reply_markup: new InlineKeyboard().text(
        'Same as the collection message',
        'collection-as-cover'
      ),
    }
  );

  const coverImage = await getImage(
    "Collection's cover",
    conversation,
    ctx,
    image
  );

  const infoMsg = await ctx.reply('Enter collection name:');
  const nameCtx = await conversation.waitFor(':text');

  const name = nameCtx.message!.text ?? '';
  let infoText = `<b>Collection name:</b> ${name}\n`;

  await infoMsg.editText(infoText, {
    parse_mode: 'HTML',
  });
  await nameCtx.deleteMessage();

  const enterCollectionMsg = await ctx.reply('Enter collection description:');
  const descriptionCtx = await conversation.waitFor(':text');

  const description = descriptionCtx.message!.text ?? '';
  infoText += `<b>Collection description:</b> ${description}\n\n`;

  await enterCollectionMsg.delete();
  await infoMsg.editText(infoText, {
    parse_mode: 'HTML',
  });
  await descriptionCtx.deleteMessage();
  const collectionType = await ctx.reply(
    'Do you want to add first items to this collection?',
    {
      reply_markup: new InlineKeyboard()
        .text('Yes', 'add-first-items')
        .row()
        .text('No', 'empty-collection'),
    }
  );
  const msg = await conversation.waitForCallbackQuery([
    'empty-collection',
    'add-first-items',
  ]);
  await collectionType.delete();
  const collectionEmpty = msg.callbackQuery.data == 'empty-collection';
  let text =
    'Please confirm minting of the new NFT collection based on this data\n' +
    messageTemplate('Collection', name, description);
  let tonAmount = '0.1';
  let addresses = [
    Address.parse('EQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAM9c'),
  ];
  let itemImage = ctx;
  let itemDescription = '';
  let itemName = '';
  if (!collectionEmpty) {
    const {
      name: itemName,
      description: itemDescription,
      image: smt,
    } = await newItem(conversation, ctx, infoMsg, infoText);
    itemImage = smt;
    addresses = await getAddresses(conversation, ctx);
    text += messageTemplate('Item', itemName, itemDescription);
    tonAmount = (
      addresses.length * (0.035 + 0.03) +
      Math.ceil(addresses.length / 6) * 0.05 +
      0.2
    ).toFixed(3);
  }
  await ctx.reply(text, {
    parse_mode: 'HTML',
    reply_markup: confirmMintingMenu,
  });

  ctx = await conversation.waitForCallbackQuery('confirm-minting');

  const wallet = await openWallet(
    process.env.MNEMONIC!.split(' '),
    Boolean(process.env.TESTNET!)
  );
  const receiverAddress = wallet.contract.address.toString();

  await ctx.editMessageText(
    `It remains just to replenish the wallet, to do this send ${tonAmount} TON to the <code>${receiverAddress.toString()}</code> by clicking the button below.`,
    {
      parse_mode: 'HTML',
      reply_markup: transferTONMenu(receiverAddress, tonAmount),
    }
  );

  await ctx.reply('Click this button when you send the transaction', {
    reply_markup: transactionSentMenu,
  });

  ctx = await conversation.waitForCallbackQuery('transaction-sent');
  await ctx.editMessageText('Start minting...', {
    reply_markup: new InlineKeyboard(),
  });
  let itemImagePathname = '';
  let itemImageFilename = '';
  if (!collectionEmpty) {
    const fileType = itemImage.message?.document?.mime_type?.includes('video')
      ? '.mp4'
      : '.jpeg';
    itemImageFilename = randomUUID() + fileType;
    itemImagePathname = await downloadFile(
      itemImage,
      itemImage.message?.document ? 'document' : 'photo', // TODO: put this validation into the function
      itemImageFilename
    );
  }

  const imageFilename = randomUUID() + '.jpg';
  const imagePathname = await downloadFile(image, 'photo', imageFilename);

  const coverImageFilename = randomUUID() + '.jpg';
  const coverImagePathname = await downloadFile(
    coverImage,
    'photo',
    coverImageFilename
  );

  const collectionContent = await createCollectionMetadata({
    name,
    description,
    imagePathname: path.join(imagePathname, imageFilename),
    coverImagePathname: path.join(coverImagePathname, coverImageFilename),
  });

  const collectionData = {
    ownerAddress: wallet.contract.address,
    royaltyPercent: 0,
    royaltyAddress: wallet.contract.address,
    nextItemIndex: 0,
    collectionContentUrl: collectionContent.url,
    commonContentUrl: collectionContent.url.split('collection.json')[0],
  };
  if (!collectionEmpty) {
    const commonContentUrl = await createMetadataFile(
      {
        name: itemName,
        description: itemDescription,
        imagePath: path.join(itemImagePathname, itemImageFilename),
      },
      name,
      undefined,
      undefined,
      undefined,
      collectionContent.data.image
    );
  }
  const collection = await mintCollection(ctx, {
    collectionData,
    wallet,
  });
  if (!collectionEmpty) {
    await mintItems(ctx, wallet, addresses, collection.address);
  }
  await ctx.reply('Would you like to continue?', {
    reply_markup: baseFlowMenu,
  });
};

export const existingCollectionNewData = async (
  conversation: Conversation,
  ctx: Context
) => {
  await conversation.run(hydrate());

  await ctx.deleteMessage();

  const collectionAddress = await getAddress(ctx, conversation);

  const infoTxt = `<b>Collection address:</b> <code>${collectionAddress.toString(
    { urlSafe: true, bounceable: true, testOnly: true }
  )}</code>\n`;

  const infoMsg = await ctx.reply(infoTxt, { parse_mode: 'HTML' });

  const { name, description, image } = await newItem(
    conversation,
    ctx,
    infoMsg,
    infoTxt
  );

  const addresses = await getAddresses(conversation, ctx);

  const text =
    'Please confirm minting of the new SBT Items based on this data\n' +
    messageTemplate('Item', name, description);
  await ctx.reply(text, {
    parse_mode: 'HTML',
    reply_markup: confirmMintingMenu,
  });

  ctx = await conversation.waitForCallbackQuery('confirm-minting');

  const wallet = await openWallet(
    process.env.MNEMONIC!.split(' '),
    Boolean(process.env.TESTNET!)
  );
  const receiverAddress = wallet.contract.address.toString();
  const tonAmount = (
    addresses.length * (0.035 + 0.03) +
    Math.ceil(addresses.length / 7) * 0.05 +
    0.2
  ).toFixed(3);

  await ctx.editMessageText(
    `It remains just to replenish the wallet, to do this send ${tonAmount} TON to the <code>${receiverAddress.toString()}</code> by clicking the button below.`,
    {
      parse_mode: 'HTML',
      reply_markup: transferTONMenu(receiverAddress, tonAmount),
    }
  );

  await ctx.reply('Click this button when you send the transaction', {
    reply_markup: transactionSentMenu,
  });

  ctx = await conversation.waitForCallbackQuery('transaction-sent');
  await ctx.editMessageText('Start minting...', {
    reply_markup: new InlineKeyboard(),
  });

  const fileType = image.message?.document?.mime_type?.includes('video')
    ? '.mp4'
    : '.jpeg';
  const imageFilename = randomUUID() + fileType;
  const imagePathname = await downloadFile(
    image,
    image.message?.document ? 'document' : 'photo', // TODO: put this validation into the function
    imageFilename
  );

  const collectionName = await NftCollection.getName(collectionAddress);

  const metadataFilename = randomUUID() + '.json';
  const nextItemIndex =
    (await NftCollection.getLastNftIndex(collectionAddress)) + 1;

  const collectionImageURL = await NftCollection.getImage(collectionAddress);

  await createMetadataFile(
    {
      name: name,
      description: description,
      imagePath: path.join(imagePathname, imageFilename),
    },
    collectionName,
    randomUUID(),
    metadataFilename,
    undefined,
    collectionImageURL
  );

  await mintItems(
    ctx,
    wallet,
    addresses,
    collectionAddress,
    nextItemIndex,
    metadataFilename
  );

  await ctx.reply('Would you like to continue?', {
    reply_markup: baseFlowMenu,
  });
};

export const existingCollectionOldData = async (
  conversation: Conversation,
  ctx: Context
) => {
  await conversation.run(hydrate());

  await ctx.deleteMessage();

  const collectionAddress = await getAddress(ctx, conversation);

  const fetchingLastNftMetadataMsg = await ctx.reply(
    'Fetching information about last nft...'
  );
  const { description, name, image } = await NftCollection.getLastNftMetadata(
    collectionAddress
  );
  const nextItemIndex =
    (await NftCollection.getLastNftIndex(collectionAddress)) + 1;

  await fetchingLastNftMetadataMsg.delete();

  const text =
    'Please confirm minting of the new SBT Items based on this data\n' +
    messageTemplate('Item', name, description);

  if (image.endsWith('.mp4')) {
    await ctx.replyWithVideo(image, {
      caption: text,
      parse_mode: 'HTML',
      reply_markup: confirmMintingMenu,
    });
  } else {
    await ctx.replyWithPhoto(image, {
      caption: text,
      parse_mode: 'HTML',
      reply_markup: confirmMintingMenu,
    });
  }

  ctx = await conversation.waitForCallbackQuery('confirm-minting');

  const addresses = await getAddresses(conversation, ctx);

  const wallet = await openWallet(
    process.env.MNEMONIC!.split(' '),
    Boolean(process.env.TESTNET!)
  );
  const receiverAddress = wallet.contract.address.toString();
  const tonAmount = (
    addresses.length * (0.035 + 0.03) +
    Math.ceil(addresses.length / 7) * 0.05 +
    0.2
  ).toFixed(3);

  await ctx.reply(
    `It remains just to replenish the wallet, to do this send ${tonAmount} TON to the <code>${receiverAddress.toString()}</code> by clicking the button below.`,
    {
      parse_mode: 'HTML',
      reply_markup: transferTONMenu(receiverAddress, tonAmount),
    }
  );

  await ctx.reply('Click this button when you send the transaction', {
    reply_markup: transactionSentMenu,
  });

  ctx = await conversation.waitForCallbackQuery('transaction-sent');
  await ctx.editMessageText('Start minting...', {
    reply_markup: new InlineKeyboard(),
  });

  await mintItems(ctx, wallet, addresses, collectionAddress, nextItemIndex);
  await ctx.reply('Would you like to continue?', {
    reply_markup: baseFlowMenu,
  });
};
