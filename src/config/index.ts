import { Config } from '@/types';

export const loadConfigFromEnv = (): Config => {
  if (!process.env.BOT_TOKEN) {
    throw new Error('Bot token is not found');
  }

  if (!process.env.ADMIN_ID) {
    throw new Error('Admin id is not found');
  }

  return {
    bot: {
      adminId: parseInt(process.env.ADMIN_ID),
      token: process.env.BOT_TOKEN,
    },
    db: {
      host: process.env.POSTGRES_HOST ?? 'localhost',
      port: process.env.POSTGRES_PORT
        ? parseInt(process.env.POSTGRES_PORT)
        : 5432,
      user: process.env.POSTGRES_USER ?? '',
      password: process.env.POSTGRES_PASSWORD ?? '',
      database: process.env.POSTGRES_DB ?? '',
    },
  };
};
