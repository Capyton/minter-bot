import { Context } from '@/types';
import { User } from '@/db';

export const addUserToWhitelist = async (ctx: Context) => {
  const user = new User();

  const userId = ctx.message!.text!.split(' ')[1];
  const pattern = /^\d+$/;
  if (pattern.test(userId)) {
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
  const userId = ctx.message!.text!.split(' ')[1];
  const pattern = /^\d+$/;

  if (pattern.test(userId)) {
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
    `<b>Users whitelist:</b>\n${users
      .map((user, index) => `${index + 1}. <a href="tg://user?id=${user.user_id}">${user.user_id}</a>`)
      .join('\n')}`,
    { parse_mode: 'HTML' }
  );
};
