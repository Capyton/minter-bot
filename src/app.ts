import { Bot, session } from 'grammy';
import * as dotenv from 'dotenv';
import { conversations, createConversation } from '@grammyjs/conversations';
import { hydrate } from '@grammyjs/hydrate';
import { run } from '@grammyjs/runner';
import 'reflect-metadata';
import { hydrateFiles } from '@grammyjs/files';
import { baseFlowMenu } from '@/menus';
import {
  anonymousHelpHandler,
  knownUserHelpHandler,
  adminHelpHandler,
  newCollection,
  existingCollectionNewData,
  existingCollectionOldData,
  addUserToWhitelist,
  deleteUserFromWhitelist,
  showWhitelist,
  cancelHandler,
} from '@/handlers';
import { Api, Context } from '@/types';
import { adminUser, knownUser } from '@/filters';
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

  const bot = new Bot<Context, Api>(config.bot.token);

  bot.api.config.use(hydrateFiles(bot.token));

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
    .use(hydrate())
    .use(dbMiddleware.handle.bind(dbMiddleware))
    .use(conversations())
    .use(createConversation(newCollection, 'new-collection'))
    .use(
      createConversation(
        existingCollectionNewData,
        'existing-collection-new-data'
      )
    )
    .use(
      createConversation(
        existingCollectionOldData,
        'existing-collection-old-data'
      )
    )
    .use(baseFlowMenu);
  bot.callbackQuery('cancel', cancelHandler);

  bot.filter(adminUser).command(['help', 'start'], adminHelpHandler);
  bot.filter(knownUser).command(['help', 'start'], knownUserHelpHandler);
  bot.command(['help', 'start'], anonymousHelpHandler);

  bot.filter(adminUser).command('list', showWhitelist);
  bot.filter(adminUser).command('list', showWhitelist);
  bot.filter(adminUser).command('add', addUserToWhitelist);
  bot.filter(adminUser).command('delete', deleteUserFromWhitelist);

  bot.filter(adminUser, adminHelpHandler);
  bot.filter(knownUser, knownUserHelpHandler);

  bot.catch((err) => {
    console.error(`Error occurred: ${err}`);
  });

  await bot.init();

  run(bot);

  console.info(`Bot @${bot.botInfo.username} is up and running`);
}

void runApp();
