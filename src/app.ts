import { Bot, session } from 'grammy';
import * as dotenv from 'dotenv';
import { conversations, createConversation } from '@grammyjs/conversations';
import { hydrate } from '@grammyjs/hydrate';
import { run } from '@grammyjs/runner';
import 'reflect-metadata';
import { hydrateFiles } from '@grammyjs/files';
import { existingCollectionMenu } from '@/menus';
import {
  anonymousHelpHandler,
  knownUserHelpHandler,
  adminHelpHandler,
  newCollection,
  newEmptyCollection,
  addUserToWhitelist,
  deleteUserFromWhitelist,
  showWhitelist,
  cancelHandler,
  tutorialsHandler,
  createNewTemplate,
  mintNewTemplateItem,
} from '@/handlers';
import { Api, Context } from '@/types';
import { adminUser, knownUser, templateUser, unknonwnUser } from '@/filters';
import { loadConfigFromEnv } from '@/config';
import { getDataSource } from '@/db';
import { DatabaseMiddleware } from '@/db/middleware';
import { mintNewFootstepSbt } from '@/handlers/collections/footsteps';
import { saveAdminUsernames } from '@/middlewares/usernames';
import { revokeSbtRewardHandler } from '@/handlers/admin/revokeReward';
import {
  mintItemsByNewData,
  mintItemsByPreviousData,
} from '@/handlers/collections/createdCollections';

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
    .use(conversations())
    .use(dbMiddleware.handle.bind(dbMiddleware))
    .use(saveAdminUsernames);
  bot.filter(unknonwnUser, anonymousHelpHandler);

  bot.callbackQuery('cancel', cancelHandler);
  bot.command('cancel', cancelHandler);

  bot.filter(adminUser).command(['help', 'start'], adminHelpHandler);
  bot.filter(knownUser).command(['help', 'start'], knownUserHelpHandler);

  bot
    .use(createConversation(newEmptyCollection, 'new-empty-collection'))
    .use(createConversation(newCollection, 'new-collection'))
    .use(createConversation(mintItemsByNewData, 'existing-collection-new-data'))
    .use(
      createConversation(
        mintItemsByPreviousData,
        'existing-collection-old-data'
      )
    )
    .use(createConversation(mintNewFootstepSbt, 'mint-footstep'))
    .use(createConversation(revokeSbtRewardHandler, 'revoke-sbt-reward'))
    .use(createConversation(createNewTemplate, 'create-new-template'))
    .use(createConversation(mintNewTemplateItem, 'use-template'));

  bot
    .filter(templateUser)
    .command(
      ['help', 'start'],
      async (ctx) => await ctx.conversation.enter('use-template')
    );

  bot.filter(adminUser).command('list', showWhitelist);
  bot.filter(adminUser).command('list', showWhitelist);
  bot.filter(adminUser).command('add', addUserToWhitelist);
  bot.filter(adminUser).command('delete', deleteUserFromWhitelist);
  bot
    .filter(adminUser)
    .callbackQuery(
      'create-new-template',
      async (ctx) => await ctx.conversation.enter('create-new-template')
    );
  bot.callbackQuery('tutorials', tutorialsHandler);

  const callbackConversationsNames = [
    'mint-footstep',
    'new-empty-collection',
    'new-collection',
    'existing-collection-new-data',
    'existing-collection-old-data',
    'revoke-sbt-reward',
    'use-template',
  ];

  for (const conversationName of callbackConversationsNames) {
    bot.callbackQuery(
      conversationName,
      async (ctx) => await ctx.conversation.enter(conversationName)
    );
  }

  bot.callbackQuery(
    'existing-collection',
    async (ctx) =>
      await ctx.editMessageText(
        'Do you want to mint an item using previously entered data or you want to update the data?',
        { reply_markup: existingCollectionMenu }
      )
  );

  bot.filter(adminUser, adminHelpHandler);
  bot.filter(knownUser, knownUserHelpHandler);

  await bot.init();

  run(bot);

  console.info(`Bot @${bot.botInfo.username} is up and running`);
}

void runApp();
