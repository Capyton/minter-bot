import { Bot, session } from 'grammy';
import * as dotenv from 'dotenv';
import { conversations, createConversation } from '@grammyjs/conversations';
import { run } from '@grammyjs/runner';
import { baseFlowMenu } from '@/menus';
import {
  anonymousHelpHandler,
  adminHelpHandler,
  newCollection,
} from '@/handlers';
import { Context } from '@/types';
import { knownUser, unknownUser } from '@/filters';

dotenv.config();

const BOT_TOKEN = process.env.BOT_TOKEN ?? '';
const ADMIN_ID = process.env.ADMIN_ID;

async function runApp() {
  console.log('Starting app...');

  const bot = new Bot<Context>(BOT_TOKEN);

  bot
    .use(async (ctx, next) => {
      ctx.config = {
        isAdmin: ctx.from?.id === Number(ADMIN_ID),
      };

      await next();
    })
    .use(
      session({
        initial() {
          return {};
        },
      })
    )
    .use(conversations())
    .use(createConversation(newCollection, 'new-collection'))
    .use(baseFlowMenu);

  bot.filter(unknownUser).command(['help', 'start'], anonymousHelpHandler);
  bot.filter(knownUser).command(['help', 'start'], adminHelpHandler);

  bot.catch((err) => {
    console.error(`Error occured: ${err}`);
  });

  await bot.init();

  run(bot);

  console.info(`Bot @${bot.botInfo.username} is up and running`);
}

void runApp();
