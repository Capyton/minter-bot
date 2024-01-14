// TODO: Remove when file flows are ready to use
import path from 'path';
import { randomUUID } from 'crypto';
import { InlineKeyboard } from 'grammy';
import { hydrate } from '@grammyjs/hydrate';

import { Address } from 'ton-core';
import { Context, Conversation } from '@/types';
import { downloadFile } from '@/utils/files';
import { mintCollection, mintItems } from '@/utils/mintCollection';
import { baseFlowMenu, cancelMenu, confirmMintingMenu } from '@/menus';
import {
  createCollectionMetadata,
  createItemMetadataFile,
} from '@/utils/metadata';
import { openWallet } from '@/utils/wallet';
import { getAddresses } from '../addresses';
import { startPaymentFlow } from '../payment';
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

export const newEmptyCollection = async (
  conversation: Conversation,
  ctx: Context
) => {
  await conversation.run(hydrate());
  const minterWallet = await openWallet();
  await ctx.editMessageText(
    "Upload collection's image:\n\nRecommended image size: a square between 400x400 and 1000x1000 pixels.\nRecommended format: png, jpg, webp, svg.",
    { reply_markup: cancelMenu }
  );
  const image = await getImage('Collection', conversation, ctx);

  await ctx.reply(
    "Upload the collection's cover image:\n\nRecommended image size: 2880x680 pixels.\nRecommended format: png, jpg, webp, svg.",
    {
      reply_markup: new InlineKeyboard().text(
        'Same as the collection image',
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

  const text =
    'Please confirm minting of the new empty NFT collection based on this data\n' +
    messageTemplate('Collection', name, description);

  await ctx.reply(text, {
    parse_mode: 'HTML',
    reply_markup: confirmMintingMenu,
  });

  ctx = await conversation.waitForCallbackQuery('confirm-minting');
  ctx = await startPaymentFlow(conversation, ctx);

  await ctx.editMessageText('Start minting...', {
    reply_markup: new InlineKeyboard(),
  });

  const imageFilename = randomUUID() + '.jpg';
  const imagePathname = await downloadFile(image, 'photo', imageFilename);

  const coverImageFilename = randomUUID() + '.jpg';
  const coverImagePathname = await downloadFile(
    coverImage,
    'photo',
    coverImageFilename
  );

  const { collectionContent, folderName } = await createCollectionMetadata({
    name,
    description,
    imagePathname: path.join(imagePathname, imageFilename),
    coverImagePathname: path.join(coverImagePathname, coverImageFilename),
  });

  const collectionData = {
    ownerAddress: minterWallet.contract.address,
    royaltyPercent: 0,
    royaltyAddress: minterWallet.contract.address,
    nextItemIndex: 0,
    collectionContentUrl: collectionContent.url,
    commonContentUrl: collectionContent.url.split('collection.json')[0],
  };

  await mintCollection(ctx, collectionData);

  await ctx.reply('Would you like to continue?', {
    reply_markup: baseFlowMenu,
  });
};

export const newCollection = async (
  conversation: Conversation,
  ctx: Context
) => {
  const minterWallet = await openWallet();
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
        'Same as the collection image',
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

  const {
    name: itemName,
    description: itemDescription,
    image: itemImage,
  } = await newItem(conversation, ctx, infoMsg, infoText);

  const addresses = await getAddresses(conversation, ctx);

  const text =
    `Please confirm minting of the new NFT collection with ${addresses.length} SBT items based on this data\n` +
    messageTemplate('Collection', name, description) +
    messageTemplate('Item', itemName, itemDescription);
  await ctx.reply(text, {
    parse_mode: 'HTML',
    reply_markup: confirmMintingMenu,
  });

  ctx = await conversation.waitForCallbackQuery('confirm-minting');

  ctx = await startPaymentFlow(conversation, ctx, addresses);

  await ctx.editMessageText('Start minting...', {
    reply_markup: new InlineKeyboard(),
  });

  const fileType = itemImage.message?.document?.mime_type?.includes('video')
    ? '.mp4'
    : '.jpeg';
  const itemImageFilename = randomUUID() + fileType;
  const itemImagePathname = await downloadFile(
    itemImage,
    itemImage.message?.document ? 'document' : 'photo', // TODO: put this validation into the function
    itemImageFilename
  );

  const imageFilename = randomUUID() + '.jpg';
  const imagePathname = await downloadFile(image, 'photo', imageFilename);

  const coverImageFilename = randomUUID() + '.jpg';
  const coverImagePathname = await downloadFile(
    coverImage,
    'photo',
    coverImageFilename
  );

  const { collectionContent, folderName } = await createCollectionMetadata({
    name,
    description,
    imagePathname: path.join(imagePathname, imageFilename),
    coverImagePathname: path.join(coverImagePathname, coverImageFilename),
  });

  const itemContentUrl = await createItemMetadataFile(
    {
      name: itemName,
      description: itemDescription,
      imagePath: path.join(itemImagePathname, itemImageFilename),
    },
    folderName,
    undefined,
    undefined,
    undefined,
    collectionContent.data.image
  );

  const collectionData = {
    ownerAddress: minterWallet.contract.address,
    royaltyPercent: 0,
    royaltyAddress: minterWallet.contract.address,
    nextItemIndex: 0,
    collectionContentUrl: collectionContent.url,
    commonContentUrl: itemContentUrl.split('item.json')[0],
  };

  const collection = await mintCollection(ctx, collectionData);

  await mintItems(ctx, addresses, collection.address);

  await ctx.reply('Would you like to continue?', {
    reply_markup: baseFlowMenu,
  });
};
