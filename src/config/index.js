"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadConfigFromEnv = void 0;
const loadConfigFromEnv = () => {
    var _a, _b, _c, _d;
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
            host: (_a = process.env.POSTGRES_HOST) !== null && _a !== void 0 ? _a : 'localhost',
            port: process.env.POSTGRES_PORT
                ? parseInt(process.env.POSTGRES_PORT)
                : 5432,
            user: (_b = process.env.POSTGRES_USER) !== null && _b !== void 0 ? _b : '',
            password: (_c = process.env.POSTGRES_PASSWORD) !== null && _c !== void 0 ? _c : '',
            database: (_d = process.env.POSTGRES_DB) !== null && _d !== void 0 ? _d : '',
        },
    };
};
exports.loadConfigFromEnv = loadConfigFromEnv;
