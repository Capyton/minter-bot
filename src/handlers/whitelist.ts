import { Context } from '@/types';
import { User } from '@/db';

export const addUserToWhitelist = async (ctx: Context) => {
  const user = new User();

  const userId = ctx.message?.text?.split(' ')[1];

  console.log(ctx.message?.text, userId, typeof userId);

  if (userId && userId.length === 9) {
    user.user_id = Number(userId);

    await user.save();

    await ctx.dbWorker.commit().then(async () => {
      await ctx.reply(`User ${userId} was saved successfully`);
    });

    return;
  }

  await ctx.reply('Invalid user id');
};

export const deleteUserFromWhitelist = async (ctx: Context) => {
  const userId = ctx.message?.text?.split(' ')[1];

  if (userId && userId.length === 9) {
    const user = await User.findOneBy({ user_id: Number(userId) });

    if (user === null) {
      await ctx.reply('User is not found');
      return;
    }

    await user.remove();
    await ctx.dbWorker.commit().then(async () => {
      await ctx.reply(`User ${userId} was successfully deleted`);
    });

    return;
  }

  await ctx.reply('Invalid user id');
};

export const showWhitelist = async (ctx: Context) => {
  const users = await ctx.queryRunner.manager.find(User);

  if (users.length === 0) {
    await ctx.reply('Users whitelist is empty');
    return;
  }

  await ctx.reply(
    `*Users whitelist:*\n${users
      .map((user, index) => `${index + 1}. ${user.user_id}`)
      .join('\n')}`,
    { parse_mode: 'Markdown' }
  );
};
