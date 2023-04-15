import { Bot, session } from 'grammy';
import * as dotenv from 'dotenv';
import { conversations, createConversation } from '@grammyjs/conversations';
import { run } from '@grammyjs/runner';
import 'reflect-metadata';
import { baseFlowMenu } from '@/menus';
import {
  anonymousHelpHandler,
  knownUserHelpHandler,
  adminHelpHandler,
  newCollection,
  addUserToWhitelist,
  deleteUserFromWhitelist,
  showWhitelist,
} from '@/handlers';
import { Context } from '@/types';
import { adminUser, knownUser, unknownUser } from '@/filters';
import { loadConfigFromEnv } from '@/config';
import { getDataSource } from '@/db';
import { DatabaseMiddleware } from '@/db/middleware';

dotenv.config();

async function runApp() {
  console.log('Starting app...');

  const config = loadConfigFromEnv();

  const dataSource = getDataSource(config.db);
  await dataSource
    .initialize()
    .then(() => console.log('Database initialized'))
    .catch((err) => {
      throw new Error(`Database initialization failed with error:\n${err}`);
    });

  const dbMiddleware = new DatabaseMiddleware(dataSource);

  const bot = new Bot<Context>(config.bot.token);

  bot
    .use(async (ctx, next) => {
      ctx.config = {
        isAdmin: ctx.from?.id === Number(config.bot.adminId),
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
    .use(dbMiddleware.handle.bind(dbMiddleware))
    .use(conversations())
    .use(createConversation(newCollection, 'new-collection'))
    .use(baseFlowMenu);

  bot.filter(adminUser).command(['help', 'start'], adminHelpHandler);
  bot.filter(knownUser).command(['help', 'start'], knownUserHelpHandler);
  bot.filter(unknownUser).command(['help', 'start'], anonymousHelpHandler);

  bot.filter(adminUser).command('add', addUserToWhitelist);
  bot.filter(adminUser).command('delete', deleteUserFromWhitelist);
  bot.filter(adminUser).command('list', showWhitelist);

  bot.catch((err) => {
    console.error(`Error occurred: ${err}`);
  });

  await bot.init();

  run(bot);

  console.info(`Bot @${bot.botInfo.username} is up and running`);
}

void runApp();
