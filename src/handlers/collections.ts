// TODO: Remove eslint-disable when the bot will be ready to use
/* eslint-disable @typescript-eslint/no-unused-vars */
import { InputFile } from 'grammy';
import { Context, Conversation } from '@/types';
import { existingCollectionMenu } from '@/menus';
import { downloadFile } from '@/utils';

const messageTemplate = (entity: string, name: string, description: string) => `
*${entity} name:* ${name}.
*${entity} description:*\n${description}
`;

export const newCollection = async (
  conversation: Conversation,
  ctx: Context
) => {
  await ctx.reply("Upload the collection's cover image");
  const collectionCover = await conversation.waitFor('message:photo');
  const collectionCoverPathname = await downloadFile(collectionCover, 'photo');

  await ctx.reply("Upload collection's image");
  const collectionImage = await conversation.waitFor('message:photo');
  const collectionImagePathname = await downloadFile(collectionImage, 'photo');

  await ctx.reply('Enter collection name');
  const name = await conversation.form.text();

  await ctx.reply('Enter collection description');
  const description = await conversation.form.text();

  await ctx.replyWithPhoto(new InputFile(collectionCoverPathname), {
    caption: messageTemplate('Collection', name, description),
    parse_mode: 'Markdown',
  });

  await ctx.conversation.exit('new-collection');
  await ctx.conversation.enter('new-item');
};

export const newItem = async (conversation: Conversation, ctx: Context) => {
  await ctx.reply('Enter item name');
  const name = await conversation.form.text();

  await ctx.reply('Enter item description');
  const description = await conversation.form.text();

  await ctx.reply("Upload item's image");
  const image = await conversation.waitFor('message:photo');
  const imagePathname = await downloadFile(image, 'photo');

  await ctx.reply(messageTemplate('Item', name, description), {
    parse_mode: 'Markdown',
  });
};

export const existingCollection = async (
  conversation: Conversation,
  ctx: Context
) => {
  await ctx.reply(
    'Do you want to mint an item using previously entered data or you want to update the data?',
    { reply_markup: existingCollectionMenu }
  );
};
