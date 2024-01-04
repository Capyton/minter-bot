import path from 'path';
import { InputFile } from 'grammy';
import { Address } from 'ton-core';
import { Context, Conversation } from '@/types';
import { downloadFile, getAddressesFromFile } from '@/utils/files';
import { cancelMenu } from '@/menus';
import { openWallet } from '@/utils/wallet';
import { NftCollection } from '@/contracts/NftCollection';

export const getCollectionAddress = async (
  ctx: Context,
  conversation: Conversation
): Promise<Address> => {
  const minterWallet = await openWallet();
  const enterCollectionAddrMsg = await ctx.reply('Enter collection address: ', {
    reply_markup: cancelMenu,
  });

  const collection = await conversation.waitFor(':text');
  if (
    !Address.isAddress(collection.message!.text) ||
    !(await NftCollection.isOwner(
      Address.parse(collection.message!.text),
      minterWallet.contract.address
    ))
  ) {
    await ctx.reply(
      'Check the correctness of the entered address and try again.'
    );
    return await getCollectionAddress(ctx, conversation);
  }

  await enterCollectionAddrMsg.delete();
  return Address.parse(collection.message!.text);
};

export const getAddressesFile = async (
  conversation: Conversation,
  ctx: Context
): Promise<Context> => {
  const file = await conversation.wait();

  if (file.message?.document) {
    return file;
  }

  await ctx.reply('File with addresses must be a file');

  return await getAddressesFile(conversation, ctx);
};

export const getAddresses = async (
  conversation: Conversation,
  ctx: Context
): Promise<Address[]> => {
  await ctx.replyWithDocument(new InputFile('./src/assets/example.txt'), {
    caption:
      'Upload the file with addresses which must receive NFT (example above)',
  });

  const file = await getAddressesFile(conversation, ctx);

  if (file.message?.document) {
    const pathname = await downloadFile(file, 'document', 'addresses');
    const addresses = await getAddressesFromFile(
      path.join(pathname, 'addresses')
    );

    return addresses;
  }

  return await getAddresses(conversation, ctx);
};

export const getAddressesFromText = async (
  conversation: Conversation,
  ctx: Context,
  text: string
): Promise<Address[]> => {
  await ctx.reply(text, { reply_markup: cancelMenu });
  const addressesList = await conversation.form.text();

  try {
    const addresses: Address[] = [];
    for (const address of addressesList.replace(' ', '').split(',')) {
      if (address) {
        addresses.push(Address.parse(address));
      }
    }
    return addresses;
  } catch {
    await ctx.reply('Check correctness of your addresses and try again.');
    return await getAddressesFromText(conversation, ctx, text);
  }
};
