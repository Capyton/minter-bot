import { Context as BaseContext } from 'grammy';

type Config = {
  isAdmin: boolean;
};

export type Context = BaseContext & {
  config: Config;
};
