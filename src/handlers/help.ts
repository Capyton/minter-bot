import { Context } from 'types';

export const helpHandler = (ctx: Context) => {
  return ctx.reply(
    `
Hey there!

${
  !ctx.config.isAdmin &&
  'Unfortunately, you do not have a permission to use it now.'
}
${
  !ctx.config.isAdmin &&
  `
*List of available commands:*
1. \`/add <user_id>\`
Adds a user to a whitelist by telegram identifier.
You can get user's telegram id in @userinfobot if needed.
`
}
  `,
    { parse_mode: 'Markdown' }
  );
};
