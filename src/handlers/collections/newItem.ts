import { MessageXFragment } from '@grammyjs/hydrate/out/data/message';
import { type Message } from 'grammy/types';
import { Context, Conversation } from '@/types';

const getItemImage = async (
  conversation: Conversation,
  ctx: Context
): Promise<Context> => {
  const image = await conversation.wait();

  if (image.message?.photo) {
    return image;
  }

  await ctx.reply('Item image must be an image');

  return await getItemImage(conversation, ctx);
};

export const newItem = async (
  conversation: Conversation,
  ctx: Context,
  infoMessage?: Message.CommonMessage & MessageXFragment & Message,
  infoMessageText?: string
) => {
  const enterItemMessage = await ctx.reply('Enter item name');

  const nameContext = await conversation.waitFor(':text');
  const name = nameContext.message!.text ?? '';
  let text = `<b>Item name:</b> ${name}\n`;

  await infoMessage!.editText(infoMessageText + text, {
    parse_mode: 'HTML',
  });

  await enterItemMessage.delete();
  await nameContext.deleteMessage();

  const enterDescriptionMsg = await ctx.reply('Enter item description');
  const descriptionContext = await conversation.waitFor(':text');

  const description = descriptionContext.message!.text ?? '';
  text += `<b>Item description:</b> ${description}`;

  await infoMessage!.editText(infoMessageText + text, {
    parse_mode: 'HTML',
  });
  await enterDescriptionMsg.delete();
  await descriptionContext.deleteMessage();

  await ctx.reply("Upload item's image");

  const image = await getItemImage(conversation, ctx);

  return { name, description, image };
};
