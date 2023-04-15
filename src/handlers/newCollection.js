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
exports.newCollection = void 0;
const messageTemplate = (entity, name, description) => `
*${entity} name:* ${name}.
*${entity} description:*\n${description}
`;
const newCollection = (conversation, ctx) => __awaiter(void 0, void 0, void 0, function* () {
    yield ctx.reply("Upload the collection's cover image");
    // const coverImage = await conversation.wait();
    yield conversation.wait();
    yield ctx.reply("Upload collection's image");
    // const image = await conversation.wait();
    yield conversation.wait();
    yield ctx.reply('Enter collection name');
    const collectionName = yield conversation.form.text();
    yield ctx.reply('Enter collection description');
    const collectionDescription = yield conversation.form.text();
    yield ctx.reply(messageTemplate('Collection', collectionName, collectionDescription), { parse_mode: 'Markdown' });
    yield ctx.reply('Enter item name');
    const itemName = yield conversation.form.text();
    yield ctx.reply('Enter item description');
    const itemDescription = yield conversation.form.text();
    yield ctx.reply("Upload item's image");
    // const itemImage = await conversation.wait();
    yield conversation.wait();
    yield ctx.reply(messageTemplate('Item', itemName, itemDescription), {
        parse_mode: 'Markdown',
    });
    yield ctx.reply('Upload the file with addresses which must receive NFT');
    // const addressesFile = await conversation.wait();
    yield conversation.wait();
    return;
});
exports.newCollection = newCollection;
