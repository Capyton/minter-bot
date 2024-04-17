import { randomUUID } from 'crypto';
import path from 'path';
import { hydrate } from '@grammyjs/hydrate';
import { InlineKeyboard } from 'grammy';
import { NftCollection } from '@/contracts/NftCollection';
import { baseFlowMenu, confirmCustomMetaMenu, confirmMintingMenu } from '@/menus';
import { Context, Conversation } from '@/types';
import { mintItems } from '@/utils/mintCollection';
import { tonClient } from '@/utils/toncenter-client';
import { downloadFile, uploadFileToS3 } from '@/utils/files';
import { createItemMetadataFile } from '@/utils/metadata';
import { getAddresses, getCollectionAddress } from '../addresses';
import { startPaymentFlow } from '../payment';
import { newItem } from './newItem';
import { messageTemplate } from './newCollections';
import { getCustomMetadata } from '../customMetadata';
import { sleep } from '@/utils/delay';

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

  const confirmCustomMetaCtx = await ctx.reply(`Do you wanna use custom metadata?`, { reply_markup: confirmCustomMetaMenu });
  const userCustomMetaConfirmationCtx =  await conversation.waitForCallbackQuery(['confirm-custom-meta', 'decline-custom-meta']);

  await confirmCustomMetaCtx.delete();

  let useCustomMeta = userCustomMetaConfirmationCtx.callbackQuery.data === 'confirm-custom-meta';

  let customMetadataJson: any;
  if (useCustomMeta) {
    customMetadataJson = await getCustomMetadata(conversation, ctx);
  }

  const text =
    `Please confirm minting of the new ${addresses.length} SBT Items based on this data\n` +
    messageTemplate('Item', name, description);
  await ctx.reply(text, {
    parse_mode: 'HTML',
    reply_markup: confirmMintingMenu,
  });

  ctx = await conversation.waitForCallbackQuery('confirm-minting');
  await ctx.editMessageReplyMarkup({ reply_markup: new InlineKeyboard() });
  ctx = await startPaymentFlow(conversation, ctx, addresses, collectionAddress);

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

  let metadataURL = await createItemMetadataFile(
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

  let splittedUrl = metadataURL.split('/')
  let basicItemContentFilename = splittedUrl[splittedUrl.length - 1];
  let basicItemContent = await (await fetch(metadataURL)).json();
  const collectionMetadataFolder = splittedUrl[splittedUrl.length - 2];

  
  if (customMetadataJson && customMetadataJson.common_values) {
    basicItemContent = {...basicItemContent, ...customMetadataJson.common_values};
    basicItemContentFilename = randomUUID() + '.json';
    await uploadFileToS3(Buffer.from(JSON.stringify(basicItemContent)), basicItemContentFilename, collectionMetadataFolder);
  }

  let specificUsersMetadataUrl: any = {}, usersProceesed = 0, totalUsers = 0;
  if (customMetadataJson && customMetadataJson.specific_values) {
    const specificUsers = Object.keys(customMetadataJson.specific_values);
    totalUsers = specificUsers.length;

    specificUsers.forEach(async (value) => {
      let specificUserMetadata = {...basicItemContent, ...customMetadataJson.specific_values[value]}
      const specificItemContentFilename = randomUUID() + '.json';
      
      await uploadFileToS3(Buffer.from(JSON.stringify(specificUserMetadata)), specificItemContentFilename, collectionMetadataFolder);
      specificUsersMetadataUrl[value] = specificItemContentFilename;
      usersProceesed++;
    })
  }
  while (usersProceesed !== totalUsers) {
    await sleep(100);
  }
  
  await mintItems(
    ctx,
    addresses,
    collectionAddress,
    nextItemIndex,
    basicItemContentFilename,
    specificUsersMetadataUrl
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
  let { metadata, metadataURL } = await NftCollection.getLastNftMetadata(
    collectionAddress,
    tonClient
  );
  const { description, name, image } = metadata;
  const nextItemIndex =
    (await NftCollection.getLastNftIndex(collectionAddress, tonClient)) + 1;

  await fetchingLastNftMetadataMsg.delete();
  const addresses = await getAddresses(conversation, ctx);

  const confirmCustomMetaCtx = await ctx.reply(`Do you wanna use custom metadata?`, { reply_markup: confirmCustomMetaMenu });
  const userCustomMetaConfirmationCtx =  await conversation.waitForCallbackQuery(['confirm-custom-meta', 'decline-custom-meta']);

  await confirmCustomMetaCtx.delete();

  let useCustomMeta = userCustomMetaConfirmationCtx.callbackQuery.data === 'confirm-custom-meta';

  let customMetadataJson: any;
  if (useCustomMeta) {
    customMetadataJson = await getCustomMetadata(conversation, ctx);
    console.log(customMetadataJson)
  }

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
  ctx = await startPaymentFlow(conversation, ctx, addresses, collectionAddress);

  await ctx.reply('Start minting...', {
    reply_markup: new InlineKeyboard(),
  });

  let splittedUrl = metadataURL.split('/')
  let basicItemContentFilename = splittedUrl[splittedUrl.length - 1];
  let basicItemContent = await (await fetch(metadataURL)).json();
  const collectionMetadataFolder = splittedUrl[splittedUrl.length - 2];

  
  if (customMetadataJson && customMetadataJson.common_values) {
    basicItemContent = {...basicItemContent, ...customMetadataJson.common_values};
    basicItemContentFilename = randomUUID() + '.json';
    await uploadFileToS3(Buffer.from(JSON.stringify(basicItemContent)), basicItemContentFilename, collectionMetadataFolder);
  }

  let specificUsersMetadataUrl: any = {}, usersProceesed = 0, totalUsers = 0;
  if (customMetadataJson && customMetadataJson.specific_values) {
    const specificUsers = Object.keys(customMetadataJson.specific_values);
    totalUsers = specificUsers.length;

    specificUsers.forEach(async (value) => {
      let specificUserMetadata = {...basicItemContent, ...customMetadataJson.specific_values[value]}
      const specificItemContentFilename = randomUUID() + '.json';
      
      await uploadFileToS3(Buffer.from(JSON.stringify(specificUserMetadata)), specificItemContentFilename, collectionMetadataFolder);
      specificUsersMetadataUrl[value] = specificItemContentFilename;
      usersProceesed++;
    })
  }
  while (usersProceesed !== totalUsers) {
    await sleep(100);
  }

  await mintItems(
    ctx,
    addresses,
    collectionAddress,
    nextItemIndex,
    basicItemContentFilename,
    specificUsersMetadataUrl
  );
  await ctx.reply('Would you like to continue?', {
    reply_markup: baseFlowMenu,
  });
};
