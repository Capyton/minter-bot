"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.unknownUser = exports.knownUser = exports.adminUser = void 0;
const db_1 = require("@/db");
const adminUser = (ctx) => ctx.config.isAdmin;
exports.adminUser = adminUser;
const knownUser = (ctx) => {
    var _a;
    const user = ctx.queryRunner.manager.findOneBy(db_1.User, {
        user_id: (_a = ctx.from) === null || _a === void 0 ? void 0 : _a.id,
    });
    return Boolean(user);
};
exports.knownUser = knownUser;
const unknownUser = (ctx) => !ctx.config.isAdmin;
exports.unknownUser = unknownUser;
