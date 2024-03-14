import { NextFunction } from 'grammy';
import { Context } from '@/types';
import { User } from '@/db';

export async function saveAdminUsernames(
  ctx: Context,
  next: NextFunction
): Promise<void> {
  const user = await User.findOneBy({ user_id: ctx.from?.id.toString() });
  if (user) {
    if (user.username !== ctx.message?.from.username) {
      user.username = ctx.message?.from.username || null;
    }
    await user.save();
  }
  await next();
}
