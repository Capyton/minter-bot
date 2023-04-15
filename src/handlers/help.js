"use strict";
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
exports.adminHelpHandler = exports.knownUserHelpHandler = exports.anonymousHelpHandler = void 0;
const menus_1 = require("@/menus");
const anonymousHelpHandler = (ctx) => __awaiter(void 0, void 0, void 0, function* () {
    return yield ctx.reply(`
Hey there :)

Unfortunately, you do not have a permission to use it right now.
  `);
});
exports.anonymousHelpHandler = anonymousHelpHandler;
const knownUserHelpHandler = (ctx) => __awaiter(void 0, void 0, void 0, function* () { return yield ctx.reply('Hey there :)', { reply_markup: menus_1.baseFlowMenu }); });
exports.knownUserHelpHandler = knownUserHelpHandler;
const adminHelpHandler = (ctx) => __awaiter(void 0, void 0, void 0, function* () {
    return yield ctx.reply(`
Hey there :)

*List of available commands:*
1. \`/add <user_id>\`
Adds a user to a whitelist by telegram identifier.

2. \`/delete <user_id>\`
Deletes a user from a whitelist, so that he cannot use this bot.

3. \`/list\`
Shows a whitelist of users, who are able to use the bot

Note: you can get user's telegram id in @userinfobot if needed.  
  `, { reply_markup: menus_1.baseFlowMenu, parse_mode: 'Markdown' });
});
exports.adminHelpHandler = adminHelpHandler;
