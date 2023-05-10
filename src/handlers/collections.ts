// TODO: Remove when file flows are ready to use
/* eslint-disable @typescript-eslint/no-unused-vars */
import path from 'path';
import { randomUUID } from 'crypto';
import { InlineKeyboard } from 'grammy';
import { hydrate } from '@grammyjs/hydrate';
import { MessageXFragment } from '@grammyjs/hydrate/out/data/message';
import { type Message } from 'grammy/types';
import { InputFile } from 'grammy';
import { Context, Conversation } from '@/types';
import { downloadFile, getAddressesFromFile } from '@/utils/files';
import {
  confirmMintingMenu,
  transactionSentMenu,
  transferTONMenu,
} from '@/menus';
import { openWallet } from '@/utils/wallet';
import { NftCollection } from '@/contracts/NftCollection';
import { waitSeqno } from '@/utils/delay';
import { createCollectionMetadata, createMetadataFile } from '@/utils/metadata';

const messageTemplate = (entity: string, name: string, description: string) => `
*${entity} name:* ${name}.
*${entity} description:*\n${description}
`;

export const newItem = async (
  conversation: Conversation,
  ctx: Context,
  infoMsg?: Message.CommonMessage & MessageXFragment & Message,
  infoMsgText?: string
) => {
  const enterItemMsg = await ctx.reply('Enter item name');
  const nameCtx = await conversation.waitFor(':text');

  const name = nameCtx.message!.text;
  let text = `*Item name:* ${name}\n`;
  await infoMsg!.editText(infoMsgText + text, { parse_mode: 'Markdown' });
  await enterItemMsg.delete();
  await nameCtx.deleteMessage();

  const enterDescriptionMsg = await ctx.reply('Enter item description');
  const descriptionCtx = await conversation.waitFor(':text');

  const description = descriptionCtx.message!.text;
  text += `*Item description:* ${description}`;
  await infoMsg!.editText(infoMsgText + text, { parse_mode: 'Markdown' });
  await enterDescriptionMsg.delete();
  await descriptionCtx.deleteMessage();

  await ctx.reply("Upload item's image");
  const image = await conversation.waitFor('message:photo');

  return { name, description, image };
};

export const getAddresses = async (
  conversation: Conversation,
  ctx: Context
) => {
  await ctx.replyWithDocument(new InputFile('./src/assets/example.txt'), {
    caption:
      'Upload the file with addresses which must receive NFT (example above)',
  });

  const file = await conversation.waitFor('message:document');
  const pathname = await downloadFile(file, 'document', 'addresses');
  const addresses = await getAddressesFromFile(
    path.join(pathname, 'addresses')
  );
  return addresses;
};

export const newCollection = async (
  conversation: Conversation,
  ctx: Context
) => {
  await conversation.run(hydrate());

  await ctx.reply("Upload collection's image:");
  const image = await conversation.waitFor('message:photo');

  await ctx.reply("Upload the collection's cover image:");
  const coverImage = await conversation.waitFor('message:photo');

  const infoMsg = await ctx.reply('Enter collection name:');
  const nameCtx = await conversation.waitFor(':text');

  const name = nameCtx.message!.text;
  let infoText = `*Collection name:* ${name}\n`;

  await infoMsg.editText(infoText, {
    parse_mode: 'Markdown',
  });
  await nameCtx.deleteMessage();

  const enterCollectionMsg = await ctx.reply('Enter collection description:');
  const descriptionCtx = await conversation.waitFor(':text');

  const description = descriptionCtx.message!.text;
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
    commonContentUrl: commonContentUrl.split('item.json')[0], // need to be rewrited
  };
  const collection = new NftCollection(collectionData);
  let seqno = await collection.deploy(wallet);
  await waitSeqno(seqno, wallet);
  await ctx.reply(
    `Collection deployed to <a href='https://getgems.io/collection/${collection.address}'>${collection.address}</a>`,
    { parse_mode: 'HTML' }
  );

  seqno = await collection.topUpBalance(wallet, addresses.size);
  await waitSeqno(seqno, wallet);

  const items = [];
  let i = 0n;
  for (const address of addresses) {
    items.push({
      index: i,
      passAmount: '0.03',
      ownerAddress: address,
      content: 'item.json',
    });
    i++;
  }

  const chunks = [];
  for (let i = 0; i < addresses.size; i += 100) {
    const chunk = items.slice(i, i + 100);
    chunks.push(chunk);
  }

  for (const chuck of chunks) {
    seqno = await collection.deployItemsBatch(wallet, chuck);
    await waitSeqno(seqno, wallet);
  }

  await ctx.reply(`${addresses.size} SBT items are successfully minted`);
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
