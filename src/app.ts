import { Bot } from 'grammy';
import * as dotenv from 'dotenv';
import { helpHandler } from 'handlers';
import { Context } from 'types';

const config = dotenv.config();

console.log(config);

const BOT_TOKEN = process.env.BOT_TOKEN ?? '';
const ADMIN_ID = process.env.ADMIN_ID;

const bot = new Bot<Context>(BOT_TOKEN);

bot.use(async (ctx, next) => {
  ctx.config = {
    isAdmin: ctx.from?.id === ADMIN_ID,
  };

  await next();
});

bot.command(['help', 'start'], helpHandler);

bot.start();
