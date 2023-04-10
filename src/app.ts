import { Bot } from 'grammy';
import * as dotenv from 'dotenv';
import { baseFlowMenu } from '@/menus';
import { helpHandler } from '@/handlers';
import { Context } from '@/types';

dotenv.config();

const BOT_TOKEN = process.env.BOT_TOKEN ?? '';
const ADMIN_ID = process.env.ADMIN_ID;

const bot = new Bot<Context>(BOT_TOKEN);

bot.use(async (ctx, next) => {
  ctx.config = {
    isAdmin: ctx.from?.id === ADMIN_ID,
  };

  await next();
});

bot.use(baseFlowMenu);

bot.command(['help', 'start'], helpHandler);

bot.start();
