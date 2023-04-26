import { Context, Conversation } from '@/types';
import { downloadFile } from '@/utils';

export const getAddresses = async (
  conversation: Conversation,
  ctx: Context
) => {
  await ctx.reply('Upload the file with addresses which must receive NFT');
  const file = await conversation.waitFor('message:document');
  const filepath = await downloadFile(file, 'document');
};
