import { Api as BaseApi, Context as BaseContext } from 'grammy';
import {
  Conversation as BaseConversation,
  ConversationFlavor,
} from '@grammyjs/conversations';
import { QueryRunner } from 'typeorm';
import { FileApiFlavor, FileFlavor } from '@grammyjs/files';
import { HydrateFlavor } from '@grammyjs/hydrate';
import { DatabaseWorker } from '@/db/middleware';

export type Context = HydrateFlavor<
  FileFlavor<
    BaseContext & {
      config: {
        isAdmin: boolean;
      };
      dbWorker: DatabaseWorker;
      queryRunner: QueryRunner;
    } & ConversationFlavor
  >
>;
export type Api = FileApiFlavor<BaseApi>;

export type Conversation = BaseConversation<Context>;

export type BotConfig = {
  adminId: number;
  token: string;
};

export type DatabaseConfig = {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
};

export type Config = {
  bot: BotConfig;
  db: DatabaseConfig;
};
