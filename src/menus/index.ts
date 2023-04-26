import { Menu } from '@grammyjs/menu';
import { Context } from '@/types';

const baseFlowMenu = new Menu<Context>('base-flow-menu')
  .text(
    'Create new collection',
    async (ctx) => await ctx.conversation.enter('new-collection')
  )
  .row()
  .text('Use existing collection', (ctx) =>
    ctx.reply('Use existing collection')
  );

const existingCollectionMenu = new Menu<Context>('existing-collection-menu')
  .text(
    'Enter new item data',
    async (ctx) => await ctx.reply('enter new item data convo')
  )
  .row()
  .text(
    'Use previous item data',
    async (ctx) => await ctx.reply('use previous item data convo')
  );

export { baseFlowMenu, existingCollectionMenu };
