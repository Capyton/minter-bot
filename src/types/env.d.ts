declare namespace NodeJS {
  interface ProcessEnv {
    readonly ADMIN_ID: number;
    readonly BOT_TOKEN: string;

    readonly POSTGRES_HOST: string;
    readonly POSTGRES_PORT: string;
    readonly POSTGRES_USER: string;
    readonly POSTGRES_PASSWORD: string;
    readonly POSTGRES_DB: string;
  }
}
