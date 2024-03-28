import { Context } from '@/types';
import { baseFlowMenu } from '@/menus';
import { User } from '@/db';

export const anonymousHelpHandler = async (ctx: Context) =>
  await ctx.reply(
    `
Hey there :)

Unfortunately, you do not have a permission to use it right now.
  `
  );

export const knownUserHelpHandler = async (ctx: Context) => {
  await ctx.conversation.exit();
  await ctx.reply('Hey there :)', { reply_markup: baseFlowMenu });
};

export const adminHelpHandler = async (ctx: Context) => {
  await ctx.conversation.exit();
  await ctx.reply(
    `
Hey there :)

<b>List of available commands:</b>
1. <code>/add *user_id*</code>
Adds a user to a whitelist by telegram identifier.

2. <code>/delete *user_id*</code>
Deletes a user from a whitelist, so that he cannot use this bot.

3. <code>/list</code>
Shows a whitelist of users, who are able to use the bot

Note: you can get user's telegram id in @username_to_id_bot if needed.  
  `,
    { reply_markup: baseFlowMenu, parse_mode: 'HTML' }
  );
};

export const cancelHandler = async (ctx: Context) => {
  await ctx.conversation.exit();
  await ctx.deleteMessage();

  const user = await User.findOneBy({ user_id: ctx.from?.id.toString() });

  if (Boolean(user) || ctx.config.isAdmin) {
    await ctx.reply('Canceled.', { reply_markup: baseFlowMenu });
  } else {
    await ctx.reply('Canceled.');
  }
};
