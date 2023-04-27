import { Context } from '@/types';
import { User } from '@/db';

export const adminUser = (ctx: Context) => ctx.config.isAdmin;

export const knownUser = async (ctx: Context) => {
  const user = await ctx.queryRunner.manager.findOneBy(User, {
    user_id: ctx.from?.id,
  });
  
  return Boolean(user);
};
