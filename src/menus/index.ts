import { Menu } from '@grammyjs/menu';
import { Context } from '@/types';

const baseFlowMenu = new Menu<Context>('base-flow-menu')
  .text(
    'Create new collection',
    async (ctx) => await ctx.conversation.enter('new-collection')
  )
  .row()
  .text(
    'Use existing collection',
    async (ctx) =>
      await ctx.reply(
        'Do you want to mint an item using previously entered data or you want to update the data?',
        { reply_markup: existingCollectionMenu }
      )
  );

const existingCollectionMenu = new Menu<Context>('existing-collection-menu')
  .text(
    'Enter new item data',
    async (ctx) => await ctx.conversation.enter('existing-collection-new-data')
  )
  .row()
  .text(
    'Use previous item data',
    async (ctx) => await ctx.conversation.enter('existing-collection-old-data')
  );

export { baseFlowMenu };
