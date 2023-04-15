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
exports.baseFlowMenu = void 0;
const menu_1 = require("@grammyjs/menu");
const baseFlowMenu = new menu_1.Menu('base-flow-menu')
    .text('Create new collection', (ctx) => __awaiter(void 0, void 0, void 0, function* () { return yield ctx.conversation.enter('new-collection'); }))
    .row()
    .text('Use existing collection', (ctx) => ctx.reply('Use existing collection'));
exports.baseFlowMenu = baseFlowMenu;
