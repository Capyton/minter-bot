import { Context, Conversation } from '@/types';

const messageTemplate = (entity: string, name: string, description: string) => `
*${entity} name:* ${name}.
*${entity} description:*\n${description}
`;

export const newCollection = async (
  conversation: Conversation,
  ctx: Context
) => {
  await ctx.reply("Upload the collection's cover image");
  const collectionCoverImage = await conversation.waitFor('message:photo');

  const collectionCoverImageId: string = collectionCoverImage.update.message
    .photo[collectionCoverImage.update.message.photo.length - 1]
    .file_id as string;

  const file = await ctx.api.getFile(collectionCoverImageId);

  const filepath = await file.download();
  console.log('File saved at ', filepath);

  await ctx.reply("Upload collection's image");
  // const image = await conversation.wait();
  await conversation.wait();

  await ctx.reply('Enter collection name');
  const collectionName = await conversation.form.text();

  await ctx.reply('Enter collection description');
  const collectionDescription = await conversation.form.text();

  await ctx.reply(
    messageTemplate('Collection', collectionName, collectionDescription),
    { parse_mode: 'Markdown' }
  );

  await ctx.reply('Enter item name');
  const itemName = await conversation.form.text();

  await ctx.reply('Enter item description');
  const itemDescription = await conversation.form.text();

  await ctx.reply("Upload item's image");
  // const itemImage = await conversation.wait();
  await conversation.wait();

  await ctx.reply(messageTemplate('Item', itemName, itemDescription), {
    parse_mode: 'Markdown',
  });

  await ctx.reply('Upload the file with addresses which must receive NFT');
  // const addressesFile = await conversation.wait();
  await conversation.wait();

  return;
};
