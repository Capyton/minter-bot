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
exports.showWhitelist = exports.deleteUserFromWhitelist = exports.addUserToWhitelist = void 0;
const db_1 = require("@/db");
const addUserToWhitelist = (ctx) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    const user = new db_1.User();
    const userId = (_b = (_a = ctx.message) === null || _a === void 0 ? void 0 : _a.text) === null || _b === void 0 ? void 0 : _b.split(' ')[1];
    if (userId && userId.length === 9) {
        user.user_id = Number(userId);
        yield user.save();
        yield ctx.dbWorker.commit().then(() => __awaiter(void 0, void 0, void 0, function* () {
            yield ctx.reply(`User ${userId} was saved successfully`);
        }));
        return;
    }
    yield ctx.reply('Invalid user id');
});
exports.addUserToWhitelist = addUserToWhitelist;
const deleteUserFromWhitelist = (ctx) => __awaiter(void 0, void 0, void 0, function* () {
    var _c, _d;
    const userId = (_d = (_c = ctx.message) === null || _c === void 0 ? void 0 : _c.text) === null || _d === void 0 ? void 0 : _d.split(' ')[1];
    if (userId && userId.length === 9) {
        const user = yield db_1.User.findOneBy({ user_id: Number(userId) });
        if (user === null) {
            yield ctx.reply('User is not found');
            return;
        }
        yield user.remove();
        yield ctx.dbWorker.commit().then(() => __awaiter(void 0, void 0, void 0, function* () {
            yield ctx.reply(`User ${userId} was successfully deleted`);
        }));
        return;
    }
    yield ctx.reply('Invalid user id');
});
exports.deleteUserFromWhitelist = deleteUserFromWhitelist;
const showWhitelist = (ctx) => __awaiter(void 0, void 0, void 0, function* () {
    const users = yield ctx.queryRunner.manager.find(db_1.User);
    if (users.length === 0) {
        yield ctx.reply('Users whitelist is empty');
        return;
    }
    yield ctx.reply(`*Users whitelist:*\n${users
        .map((user, index) => `${index + 1}. ${user.user_id}`)
        .join('\n')}`, { parse_mode: 'Markdown' });
});
exports.showWhitelist = showWhitelist;
