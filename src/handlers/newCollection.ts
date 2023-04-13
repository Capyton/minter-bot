import { Context, Conversation } from '@/types';

const collectionMessageTemplate = (name: string, description: string) => `
*Collection name:* ${name}.
*Collection description:*\n
${description}
`;

export const newCollection = async (
  conversation: Conversation,
  ctx: Context
) => {
  await ctx.reply("Upload the collection's cover image");
  // const coverImage = await conversation.wait();
  await conversation.wait();

  await ctx.reply("Upload collection's image");
  // const image = await conversation.wait();
  await conversation.wait();

  await ctx.reply('Enter collection name');
  const collectionName = await conversation.form.text();

  await ctx.reply('Enter collection description');
  const collectionDescription = await conversation.form.text();

  await ctx.reply(
    collectionMessageTemplate(collectionName, collectionDescription),
    { parse_mode: 'Markdown' }
  );

  await ctx.reply('Enter item name');
  // const itemName = await conversation.form.text();

  await ctx.reply('Enter item description');
  // const itemDescription = await conversation.form.text();
  await conversation.form.text();

  await ctx.reply("Upload item's image");
  // const itemImage = await conversation.wait();
  await conversation.wait();

  await ctx.reply('Upload the file with addresses which must receive NFT');
  // const addressesFile = await conversation.wait();
  await conversation.wait();

  return;
};
