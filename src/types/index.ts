import { Context as BaseContext } from 'grammy';
import {
  Conversation as BaseConversation,
  ConversationFlavor,
} from '@grammyjs/conversations';
import { QueryRunner } from 'typeorm';

type Config = {
  isAdmin: boolean;
};

export type Context = BaseContext & {
  config: Config;
  dbWorker: DatabaseWorker;
  queryRunner: QueryRunner;
} & ConversationFlavor;

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
