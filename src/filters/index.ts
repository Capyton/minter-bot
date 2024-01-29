import { Context } from '@/types';
import { Template, User } from '@/db';

export const adminUser = (ctx: Context) => ctx.config.isAdmin;

export const knownUser = async (ctx: Context) => {
  const user = await ctx.queryRunner.manager.findOneBy(User, {
    user_id: ctx.from?.id,
  });

  return Boolean(user);
};

export const templateUser = async (ctx: Context) => {
  const userId = ctx.from?.id || 0;
  let flag = false;

  const templates = await ctx.queryRunner.manager.find(Template);
  for (const template of templates) {
    if (template.userIds.includes(userId)) {
      flag = true;
      break;
    }
  }
  return flag || adminUser(ctx);
};

export const unknonwnUser = async (ctx: Context) => {
  return !((await knownUser(ctx)) || adminUser(ctx) || templateUser(ctx));
};
