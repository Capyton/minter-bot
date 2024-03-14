import path from 'path';
import { randomUUID } from 'crypto';
import { readFile } from 'fs/promises';
import { hydrate } from '@grammyjs/hydrate';
import { InlineKeyboard } from 'grammy';
import { Address } from 'ton-core';
import {
  approveNewTemplateMenu,
  baseFlowMenu,
  cancelMenu,
  confirmMintingMenu,
  templatesMenu,
} from '@/menus';
import { Context, Conversation } from '@/types';
import { Template } from '@/db';
import { downloadFile, uploadFileToS3 } from '@/utils/files';
import { NftCollection } from '@/contracts/NftCollection';
import { tonClient } from '@/utils/toncenter-client';
import { mintItems } from '@/utils/mintCollection';
import { createItemMetadataFile } from '@/utils/metadata';
import { newItem } from '../collections/newItem';
import { getAddresses, getCollectionAddress } from '../addresses';
import { messageTemplate } from '../collections';
import { startPaymentFlow } from '../payment';

export const createNewTemplate = async (
  conversation: Conversation,
  ctx: Context
) => {
  await conversation.run(hydrate());
  await ctx.callbackQuery?.message?.delete();

  let infoMsg = await ctx.reply('Enter the name of the new template:', {
    reply_markup: cancelMenu,
  });
  const nameCtx = await conversation.waitFor(':text');
  const templateName = nameCtx.message!.text ?? '';
  let infoText = `<b>Template name:</b> ${templateName}\n`;

  await infoMsg.editText(infoText, {
    parse_mode: 'HTML',
  });
  await nameCtx.deleteMessage();

  const collectionAddress = await getCollectionAddress(ctx, conversation);

  infoText += `<b>Collection address: <code>${collectionAddress.toString({
    urlSafe: true,
    bounceable: true,
    testOnly: true,
  })}</code></b>\n`;
  await infoMsg.editText(infoText, {
    parse_mode: 'HTML',
  });
  infoText += '\n';
  const { name, description, contentCtx, newInfoText } = await newItem(
    conversation,
    ctx,
    infoMsg,
    infoText,
    true
  );

  await infoMsg.delete();
  infoText = newInfoText + '\n\n';
  infoMsg = await ctx.reply(infoText, { parse_mode: 'HTML' });

  const userIdsMessage = await ctx.reply(
    'Send the ids of users who will have access to this template separated by comma (see example below):\n\nP.S. You can use @username_to_id_bot to get id from username'
  );
  const userIdsMessageExample = await ctx.reply('439739, 2001635897');

  const userIdsText = await conversation.form.text();

  await userIdsMessage.delete();
  await userIdsMessageExample.delete();

  const userIds = userIdsText.replace(' ', '').split(',');

  infoText += `<b>Users:</b> ${userIds.join(', ')}`;

  await infoMsg.editText(infoText, {
    parse_mode: 'HTML',
  });

  const confirmnMsg = await ctx.reply(
    'Сonfirm the creation of a new template:',
    { reply_markup: approveNewTemplateMenu }
  );

  const approveCtx = await conversation.waitForCallbackQuery(
    'approve-new-template'
  );

  const waitMsg = await ctx.reply('wait...');
  await confirmnMsg.delete();

  const fileType = contentCtx.message?.document?.mime_type?.includes('video')
    ? '.mp4'
    : '.jpeg';
  const itemContentFilename = randomUUID() + fileType;
  const itemContentPathname = await downloadFile(
    contentCtx,
    contentCtx.message?.document ? 'document' : 'photo',
    itemContentFilename
  );

  const folderName = await NftCollection.getMetadataFolderName(
    tonClient,
    collectionAddress
  );

  const itemContent = await readFile(
    path.join(itemContentPathname, itemContentFilename)
  );
  const itemContentURL = await uploadFileToS3(
    itemContent,
    'content' + fileType,
    folderName
  );

  const template = new Template();
  template.name = templateName;
  template.itemContentURL = itemContentURL;
  template.itemDescription = description;
  template.itemName = name;
  template.userIds = userIds;
  template.collectionAddress = collectionAddress.toRawString();
  template.has_parameters = name.includes('$') || description.includes('$');

  if (!template.has_parameters) {
    const collectionLogo = await NftCollection.getImage(
      collectionAddress,
      tonClient
    );
    await createItemMetadataFile(
      {
        name,
        description,
        imagePath: undefined,
      },
      folderName,
      itemContentURL,
      'template-metadata.json',
      itemContentURL,
      collectionLogo
    );
  }

  await template.save();
  await approveCtx.dbWorker.commit().then(async () => {
    await waitMsg.delete();
    await ctx.reply('Done!');
    await ctx.reply('Would you like to continue?', {
      reply_markup: baseFlowMenu,
    });
  });
};

export const mintNewTemplateItem = async (
  conversation: Conversation,
  ctx: Context
) => {
  await conversation.run(hydrate());
  await ctx.message?.delete();
  await ctx.callbackQuery?.message?.delete();

  const userId = ctx.callbackQuery
    ? ctx.callbackQuery.from.id
    : ctx.message?.from.id;
  const templates = await Template.find();
  const infoMsg = await ctx.reply('Choose template:', {
    reply_markup: templatesMenu(templates, userId!.toString()),
  });

  const templateCtx = await conversation.waitForCallbackQuery(/^template-/);
  await infoMsg.delete();
  const tempalteId = Number(
    templateCtx.callbackQuery.data.split('template-').pop()
  );

  const template = await Template.findOneBy({ id: tempalteId });

  if (!template) {
    return;
  }

  const addresses = await getAddresses(conversation, ctx);

  let { itemName, itemDescription } = template;
  if (template.has_parameters) {
    if (itemName.includes('$')) {
      for (const word of itemName.split(' ')) {
        if (!word.startsWith('$')) {
          continue;
        }
        await ctx.reply(
          `Enter value, that will be used instead of ${word} in the name:`
        );
        const text = await conversation.form.text();
        itemName = itemName.replace(word, text);
      }
    }
    if (itemDescription.includes('$')) {
      for (const word of itemDescription.split(' ')) {
        if (!word.startsWith('$')) {
          continue;
        }
        await ctx.reply(
          `Enter value, that will be used instead of ${word} in the description:`
        );
        const text = await conversation.form.text();
        itemDescription = itemDescription.replace(word, text);
      }
    }
  }

  const text =
    `Please confirm minting of the new ${addresses.length} SBT Items based on this data\n` +
    messageTemplate('Item', itemName, itemDescription);

  await ctx.reply(text, {
    parse_mode: 'HTML',
    reply_markup: confirmMintingMenu,
  });
  ctx = await conversation.waitForCallbackQuery('confirm-minting');
  ctx = await startPaymentFlow(conversation, ctx, addresses);

  await ctx.reply('Start minting...', {
    reply_markup: new InlineKeyboard(),
  });

  let metadataFilename = 'template-metadata.json';
  const collectionAddress = Address.parse(template.collectionAddress);

  const folderName = await NftCollection.getMetadataFolderName(
    tonClient,
    collectionAddress
  );
  const collectionLogo = await NftCollection.getImage(
    collectionAddress,
    tonClient
  );

  const nextItemIndex =
    (await NftCollection.getLastNftIndex(collectionAddress, tonClient)) + 1;

  if (template.has_parameters) {
    metadataFilename = randomUUID() + '.json';
    await createItemMetadataFile(
      {
        name: itemName,
        description: itemDescription,
        imagePath: undefined,
      },
      folderName,
      template.itemContentURL,
      metadataFilename,
      template.itemContentURL,
      collectionLogo
    );
  }
  await mintItems(
    ctx,
    addresses,
    Address.parse(template.collectionAddress),
    nextItemIndex,
    metadataFilename
  );
  if (ctx.config.isAdmin) {
    await ctx.reply('Would you like to continue?', {
      reply_markup: baseFlowMenu,
    });
  }
};
