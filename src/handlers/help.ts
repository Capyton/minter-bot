import { Context } from '@/types';
import { baseFlowMenu } from '@/menus';

export const anonymousHelpHandler = (ctx: Context) =>
  ctx.reply(
    `
Hey there :)

Unfortunately, you do not have a permission to use it now.
  `
  );

export const adminHelpHandler = (ctx: Context) => {
  return ctx.reply(
    `
Hey there :)

*List of available commands:*
1. \`/add <user_id>\`
Adds a user to a whitelist by telegram identifier.
You can get user's telegram id in @userinfobot if needed.  
  `,
    { reply_markup: baseFlowMenu, parse_mode: 'Markdown' }
  );
};
