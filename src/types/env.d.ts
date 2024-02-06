declare namespace NodeJS {
  interface ProcessEnv {
    readonly ADMIN_ID: string;
    readonly BOT_TOKEN: string;

    readonly POSTGRES_HOST: string;
    readonly POSTGRES_PORT: string;
    readonly POSTGRES_USER: string;
    readonly POSTGRES_PASSWORD: string;
    readonly POSTGRES_DB: string;

    readonly MNEMONIC: string;
    readonly TONCENTER_API_KEY: string;
    readonly TONAPI_API_KEY: string;

    readonly ACCESS_KEY_ID: string;
    readonly SECRET_ACCESS_KEY: string;
    readonly BUCKET_NAME: string;
  }
}
