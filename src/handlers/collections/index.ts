// TODO: Remove when file flows are ready to use
/* eslint-disable @typescript-eslint/no-unused-vars */
import path from 'path';
import { randomUUID } from 'crypto';
import { InlineKeyboard } from 'grammy';
import { hydrate } from '@grammyjs/hydrate';

import { Context, Conversation } from '@/types';
import { downloadFile } from '@/utils/files';
import { mintCollection } from '@/utils/mintCollection';
import {
  confirmMintingMenu,
  transactionSentMenu,
  transferTONMenu,
} from '@/menus';
import { openWallet } from '@/utils/wallet';
import { createCollectionMetadata, createMetadataFile } from '@/utils/metadata';
import { getAddresses } from './getAddresses';
import { newItem } from './newItem';

const messageTemplate = (entity: string, name: string, description: string) => `
*${entity} name:* ${name}.
*${entity} description:*\n${description}
`;

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

  await ctx.reply(
    "Upload collection's image:\n\nRecommended image size: a square between 400x400 and 1000x1000 pixels. Format: png, jpg, webp, svg."
  );
  const image = await getImage('Collection', conversation, ctx);

  await ctx.reply(
    "Upload the collection's cover image:\nRecommended image size: 2880x680 pixels.\nRecommended Format: png, jpg, webp, svg.",
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
  let infoText = `*Collection name:* ${name}\n`;

  await infoMsg.editText(infoText, {
    parse_mode: 'Markdown',
  });
  await nameCtx.deleteMessage();

  const enterCollectionMsg = await ctx.reply('Enter collection description:');
  const descriptionCtx = await conversation.waitFor(':text');

  const description = descriptionCtx.message!.text ?? '';
  infoText += `*Collection description:* ${description}\n\n`;

  await enterCollectionMsg.delete();
  await infoMsg.editText(infoText, {
    parse_mode: 'Markdown',
  });
  await descriptionCtx.deleteMessage();

  const {
    name: itemName,
    description: itemDescription,
    image: itemImage,
  } = await newItem(conversation, ctx, infoMsg, infoText);

  const addresses = await getAddresses(conversation, ctx);

  const text =
    'Please confirm minting of the new NFT collection based on this data\n' +
    messageTemplate('Collection', name, description) +
    messageTemplate('Item', itemName, itemDescription);
  await ctx.reply(text, {
    parse_mode: 'Markdown',
    reply_markup: confirmMintingMenu,
  });

  ctx = await conversation.waitForCallbackQuery('confirm-minting');

  const wallet = await openWallet(process.env.MNEMONIC!.split(' '), false);
  const receiverAddress = wallet.contract.address.toString();
  const tonAmount = (
    addresses.size * (0.05 + 0.035) +
    Math.ceil(addresses.size / 100) * 0.05 +
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

  // TODO: refuse to fully download files
  const itemImageFilename = randomUUID() + '.jpg';
  const itemImagePathname = await downloadFile(
    itemImage,
    'photo',
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

  const commonContentUrl = await createMetadataFile(
    {
      name: itemName,
      description: itemDescription,
      imagePath: path.join(itemImagePathname, itemImageFilename),
    },
    name
  );
  const collectionContentUrl = await createCollectionMetadata({
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
    collectionContentUrl,
    commonContentUrl: commonContentUrl.split('item.json')[0], // need to be rewritten
  };

  await mintCollection(ctx, { collectionData, wallet, addresses });
};

export const existingCollectionNewData = async (
  conversation: Conversation,
  ctx: Context
) => {
  const { name, description } = await newItem(conversation, ctx);

  const addresses = await getAddresses(conversation, ctx);

  // TODO: mint
};

export const existingCollectionOldData = async (
  conversation: Conversation,
  ctx: Context
) => {
  // TODO: get old data
  const name = '';
  const description = '';

  const addresses = await getAddresses(conversation, ctx);

  // TODO: mint
};
