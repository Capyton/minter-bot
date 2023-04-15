"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const grammy_1 = require("grammy");
const dotenv = __importStar(require("dotenv"));
const conversations_1 = require("@grammyjs/conversations");
const runner_1 = require("@grammyjs/runner");
require("reflect-metadata");
const menus_1 = require("@/menus");
const handlers_1 = require("@/handlers");
const filters_1 = require("@/filters");
const config_1 = require("@/config");
const db_1 = require("@/db");
const middleware_1 = require("@/db/middleware");
dotenv.config();
function runApp() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('Starting app...');
        const config = (0, config_1.loadConfigFromEnv)();
        const dataSource = (0, db_1.getDataSource)(config.db);
        yield dataSource
            .initialize()
            .then(() => console.log('Database initialized'))
            .catch((err) => {
            throw new Error(`Database initialization failed with error:\n${err}`);
        });
        const dbMiddleware = new middleware_1.DatabaseMiddleware(dataSource);
        const bot = new grammy_1.Bot(config.bot.token);
        bot
            .use((ctx, next) => __awaiter(this, void 0, void 0, function* () {
            var _a;
            ctx.config = {
                isAdmin: ((_a = ctx.from) === null || _a === void 0 ? void 0 : _a.id) === Number(config.bot.adminId),
            };
            yield next();
        }))
            .use((0, grammy_1.session)({
            initial() {
                return {};
            },
        }))
            .use(dbMiddleware.handle.bind(dbMiddleware))
            .use((0, conversations_1.conversations)())
            .use((0, conversations_1.createConversation)(handlers_1.newCollection, 'new-collection'))
            .use(menus_1.baseFlowMenu);
        bot.filter(filters_1.adminUser).command(['help', 'start'], handlers_1.adminHelpHandler);
        bot.filter(filters_1.knownUser).command(['help', 'start'], handlers_1.knownUserHelpHandler);
        bot.filter(filters_1.unknownUser).command(['help', 'start'], handlers_1.anonymousHelpHandler);
        bot.filter(filters_1.adminUser).command('add', handlers_1.addUserToWhitelist);
        bot.filter(filters_1.adminUser).command('delete', handlers_1.deleteUserFromWhitelist);
        bot.filter(filters_1.adminUser).command('list', handlers_1.showWhitelist);
        bot.catch((err) => {
            console.error(`Error occurred: ${err}`);
        });
        yield bot.init();
        (0, runner_1.run)(bot);
        console.info(`Bot @${bot.botInfo.username} is up and running`);
    });
}
void runApp();
