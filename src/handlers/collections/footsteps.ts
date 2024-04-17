import { randomUUID } from 'crypto';
import { hydrate } from '@grammyjs/hydrate';
import { InlineKeyboard } from 'grammy';
import { Address } from 'ton-core';
import { NftCollection } from '@/contracts/NftCollection';
import {
  baseFlowMenu,
  confirmCustomMetaMenu,
  confirmMintingMenu,
} from '@/menus';
import { Context, Conversation } from '@/types';
import { mintItems } from '@/utils/mintCollection';
import { createItemMetadataFile } from '@/utils/metadata';
import { tonClient } from '@/utils/toncenter-client';
import { sleep } from '@/utils/delay';
import { uploadFileToS3 } from '@/utils/files';
import { getAddressesFromText } from '../addresses';
import { startPaymentFlow } from '../payment';
import { getCustomMetadata } from '../customMetadata';
import { messageTemplate } from './newCollections';

export const mintNewFootstepSbt = async (
  conversation: Conversation,
  ctx: Context
) => {
  await conversation.run(hydrate());

  await ctx.deleteMessage();

  const collectionAddress = Address.parse(
    'EQBAJCGblueX9Nwr84TmrcLmIoPbeunnujBoziT3MtJuaJ0J'
  );
  const collectionPhoto =
    'https://sbt-bot-minter.s3.amazonaws.com/TON%20Bounties%20Contributors/logo.jpg';

  await ctx.reply('Send link to the footstep issue from github:');
  const footstepLink = await conversation.form.text();

  const addresses = await getAddressesFromText(
    conversation,
    ctx,
    'Send addresses, which should receive SBT rewards according to this example:\n\nEQCD39VS5jcptHL8vMjEXrzGaRcCVYto7HUn4bpAOg8xqB2N, EQDaaxtmY6Dk0YzIV0zNnbUpbjZ92TJHBvO72esc0srwv8K2'
  );

  const confirmCustomMetaCtx = await ctx.reply(
    'Do you wanna use custom metadata?',
    { reply_markup: confirmCustomMetaMenu }
  );
  const userCustomMetaConfirmationCtx = await conversation.waitForCallbackQuery(
    ['confirm-custom-meta', 'decline-custom-meta']
  );

  await confirmCustomMetaCtx.delete();

  const useCustomMeta =
    userCustomMetaConfirmationCtx.callbackQuery.data === 'confirm-custom-meta';

  let customMetadataJson: any;
  if (useCustomMeta) {
    customMetadataJson = await getCustomMetadata(conversation, ctx);
  }

  const footstepIndex = footstepLink.split('/').pop();

  const name = `TON Bounty #${footstepIndex}`;
  const description = 'Reward for valuable TON Ecosystem contributions';

  const text =
    'Please confirm minting of the new Bounty SBT Items based on this data\n' +
    messageTemplate('Item', name, description, addresses);

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
  const metadataFilename = `${footstepIndex}.json`;
  const footstepVideo =
    'https://sbt-bot-minter.s3.amazonaws.com/TON%20Bounties%20Contributors/255d1591-cb28-4f51-a975-ae1e5a6330db.mp4';
  const metadataURL = await createItemMetadataFile(
    {
      name,
      description,
      imagePath: undefined,
    },
    'TON Bounties Contributors',
    footstepVideo,
    metadataFilename,
    footstepVideo,
    collectionPhoto
  );
  const nextItemIndex =
    (await NftCollection.getLastNftIndex(collectionAddress, tonClient)) + 1;

  const splittedUrl = metadataURL.split('/');
  let basicItemContentFilename = splittedUrl[splittedUrl.length - 1];
  let basicItemContent = await (await fetch(metadataURL)).json();
  const collectionMetadataFolder = splittedUrl[splittedUrl.length - 2];
  if (customMetadataJson && customMetadataJson.common_values) {
    basicItemContent = {
      ...basicItemContent,
      ...customMetadataJson.common_values,
    };
    basicItemContentFilename = randomUUID() + '.json';
    await uploadFileToS3(
      Buffer.from(JSON.stringify(basicItemContent)),
      basicItemContentFilename,
      collectionMetadataFolder
    );
  }

  const specificUsersMetadataUrl: any = {};
  let usersProceesed = 0,
    totalUsers = 0;
  if (customMetadataJson && customMetadataJson.specific_values) {
    const specificUsers = Object.keys(customMetadataJson.specific_values);
    totalUsers = specificUsers.length;

    specificUsers.forEach(async (value) => {
      const specificUserMetadata = {
        ...basicItemContent,
        ...customMetadataJson.specific_values[value],
      };
      const specificItemContentFilename = randomUUID() + '.json';

      await uploadFileToS3(
        Buffer.from(JSON.stringify(specificUserMetadata)),
        specificItemContentFilename,
        collectionMetadataFolder
      );
      specificUsersMetadataUrl[value] = specificItemContentFilename;
      usersProceesed++;
    });
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
