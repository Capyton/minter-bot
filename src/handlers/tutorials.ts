import { tutorialsMenu } from '@/menus';
import { Context } from '@/types';

export async function tutorialsHandler(ctx: Context) {
  await ctx.editMessageText(
    'Enjoy our tutorials! Still have some questions? Write @SwiftAdviser!',
    {
      reply_markup: tutorialsMenu,
    }
  );
}
