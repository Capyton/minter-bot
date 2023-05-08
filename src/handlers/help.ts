import { Context } from '@/types';
import { baseFlowMenu } from '@/menus';

export const anonymousHelpHandler = async (ctx: Context) =>
  await ctx.reply(
    `
Hey there :)

Unfortunately, you do not have a permission to use it right now.
  `
  );

export const knownUserHelpHandler = async (ctx: Context) =>
  await ctx.reply('Hey there :)', { reply_markup: baseFlowMenu });

export const adminHelpHandler = async (ctx: Context) =>
  await ctx.reply(
    `
Hey there :)

*List of available commands:*
1. \`/add <user_id>\`
Adds a user to a whitelist by telegram identifier.

2. \`/delete <user_id>\`
Deletes a user from a whitelist, so that he cannot use this bot.

3. \`/list\`
Shows a whitelist of users, who are able to use the bot

Note: you can get user's telegram id in @userinfobot if needed.  
  `,
    { reply_markup: baseFlowMenu, parse_mode: 'Markdown' }
  );

export const cancelHandler = async (ctx: Context) => {
  await ctx.deleteMessage();
  await ctx.reply('Canceled.');
};
