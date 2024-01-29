import { MessageXFragment } from '@grammyjs/hydrate/out/data/message';
import { type Message } from 'grammy/types';
import { Context, Conversation } from '@/types';

const getItemContent = async (
  conversation: Conversation,
  ctx: Context
): Promise<Context> => {
  const contentCtx = await conversation.wait();

  if (
    contentCtx.message?.photo ||
    contentCtx.message?.document?.mime_type === 'video/mp4' ||
    contentCtx.message?.document?.mime_type?.includes('image')
  ) {
    return contentCtx;
  }

  await ctx.reply('Check the correctness of the sent file');

  return await getItemContent(conversation, ctx);
};

export const newItem = async (
  conversation: Conversation,
  ctx: Context,
  infoMessage?: Message.CommonMessage & MessageXFragment & Message,
  infoMessageText?: string,
  forTemplate = false
) => {
  let noteAboutParametersMsg;
  if (forTemplate) {
    const parametersExampleText = `
<b>Note that you can use parameters in your item name or description using $ like this:</b>

<code>Reward for completion bounty $BOUNTY_NUMBER</code>
`;
    noteAboutParametersMsg = await ctx.reply(parametersExampleText, {
      parse_mode: 'HTML',
    });
  }
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
  if (forTemplate && noteAboutParametersMsg) {
    await noteAboutParametersMsg.delete();
  }

  await ctx.reply(
    "Upload item's image or video as a document (the document cannot weigh more than 25mb)"
  );

  const contentCtx = await getItemContent(conversation, ctx);
  const newInfoText = infoMessageText + text;
  return { name, description, contentCtx, newInfoText };
};
