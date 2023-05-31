import path from 'path';
import { InputFile } from 'grammy';
import { Address } from 'ton-core';
import { Context, Conversation } from '@/types';
import { downloadFile, getAddressesFromFile } from '@/utils/files';

const getAddressesFile = async (
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
