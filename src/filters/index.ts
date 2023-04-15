import { Context } from '@/types';
import { User } from '@/db';

export const adminUser = (ctx: Context) => ctx.config.isAdmin;

export const knownUser = (ctx: Context) => {
  const user = ctx.queryRunner.manager.findOneBy(User, {
    user_id: ctx.from?.id,
  });

  return Boolean(user);
};

export const unknownUser = (ctx: Context) => !ctx.config.isAdmin;
