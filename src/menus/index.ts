import { Menu } from '@grammyjs/menu';
import { Context } from '@/types';

const baseFlowMenu = new Menu<Context>('base-flow-menu')
  .text('Create new collection', (ctx) =>
    ctx.conversation.enter('new-collection')
  )
  .text('Use existing collection', (ctx) =>
    ctx.reply('Use existing collection')
  );

export { baseFlowMenu };
