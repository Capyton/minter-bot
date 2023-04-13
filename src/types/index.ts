import { Context as BaseContext } from 'grammy';
import {
  Conversation as BaseConversation,
  ConversationFlavor,
} from '@grammyjs/conversations';

type Config = {
  isAdmin: boolean;
};

export type Context = BaseContext & {
  config: Config;
} & ConversationFlavor;

export type Conversation = BaseConversation<Context>;
