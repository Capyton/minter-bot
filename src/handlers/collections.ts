// TODO: Remove when file flows are ready to use
/* eslint-disable @typescript-eslint/no-unused-vars */
import { Context, Conversation } from '@/types';
import { downloadFile } from '@/utils';

const messageTemplate = (entity: string, name: string, description: string) => `
*${entity} name:* ${name}.
*${entity} description:*\n${description}
`;

export const newItem = async (conversation: Conversation, ctx: Context) => {
  await ctx.reply('Enter item name');
  const name = await conversation.form.text();

  await ctx.reply('Enter item description');
  const description = await conversation.form.text();

  await ctx.reply("Upload item's image");
  const image = await conversation.waitFor('message:photo');
  const pathname = await downloadFile(image, 'photo', 'itemImage');

  await ctx.reply(messageTemplate('Item', name, description), {
    parse_mode: 'Markdown',
  });

  return { name, description, image };
};

export const getAddresses = async (
  conversation: Conversation,
  ctx: Context
) => {
  await ctx.reply('Upload the file with addresses which must receive NFT');

  const file = await conversation.waitFor('message:document');
  const pathname = await downloadFile(file, 'document', 'addresses');

  return { file, pathname };
};

export const newCollection = async (
  conversation: Conversation,
  ctx: Context
) => {
  await ctx.reply("Upload the collection's cover image");
  const coverImage = await conversation.waitFor('message:photo');

  await ctx.reply("Upload collection's image");
  const image = await conversation.waitFor('message:photo');

  await ctx.reply('Enter collection name');
  const name = await conversation.form.text();

  await ctx.reply('Enter collection description');
  const description = await conversation.form.text();

  await ctx.reply(messageTemplate('Collection', name, description), {
    parse_mode: 'Markdown',
  });

  const { name: itemName, description: itemDescription } = await newItem(
    conversation,
    ctx
  );

  if (itemName && itemDescription) {
    const { file } = await getAddresses(conversation, ctx);
  }
};

export const existingCollectionNewData = async (
  conversation: Conversation,
  ctx: Context
) => {
  const { name, description } = await newItem(conversation, ctx);

  if (name && description) {
    const { file } = await getAddresses(conversation, ctx);

    // TODO: mint
  }
};

export const existingCollectionOldData = async (
  conversation: Conversation,
  ctx: Context
) => {
  // TODO: get old data
  const name = '';
  const description = '';

  if (name && description) {
    const { file } = await getAddresses(conversation, ctx);

    // TODO: mint
  }
};
