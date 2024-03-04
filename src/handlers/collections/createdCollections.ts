import { randomUUID } from 'crypto';
import path from 'path';
import { hydrate } from '@grammyjs/hydrate';
import { InlineKeyboard } from 'grammy';
import { NftCollection } from '@/contracts/NftCollection';
import { baseFlowMenu, confirmMintingMenu } from '@/menus';
import { Context, Conversation } from '@/types';
import { mintItems } from '@/utils/mintCollection';
import { tonClient } from '@/utils/toncenter-client';
import { downloadFile } from '@/utils/files';
import { createItemMetadataFile } from '@/utils/metadata';
import { getAddresses, getCollectionAddress } from '../addresses';
import { startPaymentFlow } from '../payment';
import { newItem } from './newItem';
import { messageTemplate } from './newCollections';

export const mintItemsByNewData = async (
  conversation: Conversation,
  ctx: Context
) => {
  await conversation.run(hydrate());

  await ctx.deleteMessage();

  const collectionAddress = await getCollectionAddress(ctx, conversation);

  const infoTxt = `<b>Collection address:</b> <code>${collectionAddress.toString(
    { urlSafe: true, bounceable: true, testOnly: true }
  )}</code>\n`;

  const infoMsg = await ctx.reply(infoTxt, { parse_mode: 'HTML' });

  const { name, description, contentCtx } = await newItem(
    conversation,
    ctx,
    infoMsg,
    infoTxt
  );

  const addresses = await getAddresses(conversation, ctx);

  const text =
    `Please confirm minting of the new ${addresses.length} SBT Items based on this data\n` +
    messageTemplate('Item', name, description);
  await ctx.reply(text, {
    parse_mode: 'HTML',
    reply_markup: confirmMintingMenu,
  });

  ctx = await conversation.waitForCallbackQuery('confirm-minting');
  await ctx.editMessageReplyMarkup({ reply_markup: new InlineKeyboard() });
  ctx = await startPaymentFlow(conversation, ctx, addresses);

  await ctx.reply('Start minting...', {
    reply_markup: new InlineKeyboard(),
  });

  const fileType = contentCtx.message?.document?.mime_type?.includes('video')
    ? '.mp4'
    : '.jpeg';
  const imageFilename = randomUUID() + fileType;
  const imagePathname = await downloadFile(
    contentCtx,
    contentCtx.message?.document ? 'document' : 'photo',
    imageFilename
  );

  const metadataFilename = randomUUID() + '.json';
  const nextItemIndex =
    (await NftCollection.getLastNftIndex(collectionAddress, tonClient)) + 1;

  const collectionImageURL = await NftCollection.getImage(
    collectionAddress,
    tonClient
  );
  const folderName = await NftCollection.getMetadataFolderName(
    tonClient,
    collectionAddress
  );

  await createItemMetadataFile(
    {
      name: name,
      description: description,
      imagePath: path.join(imagePathname, imageFilename),
    },
    folderName,
    randomUUID(),
    metadataFilename,
    undefined,
    collectionImageURL
  );

  await mintItems(
    ctx,
    addresses,
    collectionAddress,
    nextItemIndex,
    metadataFilename
  );

  await ctx.reply('Would you like to continue?', {
    reply_markup: baseFlowMenu,
  });
};

export const mintItemsByPreviousData = async (
  conversation: Conversation,
  ctx: Context
) => {
  await conversation.run(hydrate());

  await ctx.deleteMessage();

  const collectionAddress = await getCollectionAddress(ctx, conversation);

  const fetchingLastNftMetadataMsg = await ctx.reply(
    'Fetching information about last nft...'
  );
  const { metadata, metadataURL } = await NftCollection.getLastNftMetadata(
    collectionAddress,
    tonClient
  );
  const { description, name, image } = metadata;
  const nextItemIndex =
    (await NftCollection.getLastNftIndex(collectionAddress, tonClient)) + 1;

  await fetchingLastNftMetadataMsg.delete();
  const addresses = await getAddresses(conversation, ctx);
  const text =
    `Please confirm minting of the new ${addresses.length} SBT Items based on this data\n` +
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
  await ctx.editMessageReplyMarkup({ reply_markup: new InlineKeyboard() });
  ctx = await startPaymentFlow(conversation, ctx, addresses);

  await ctx.reply('Start minting...', {
    reply_markup: new InlineKeyboard(),
  });

  await mintItems(
    ctx,
    addresses,
    collectionAddress,
    nextItemIndex,
    metadataURL.split('/').pop()
  );
  await ctx.reply('Would you like to continue?', {
    reply_markup: baseFlowMenu,
  });
};
