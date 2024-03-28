import { InlineKeyboard } from 'grammy';
import { loadConfigFromEnv } from '@/config';
import { Template } from '@/db';

export const baseFlowMenu = new InlineKeyboard()
  .text('Create new collection', 'new-collection')
  .row()
  .text('Create new empty collection', 'new-empty-collection')
  .row()
  .text('Use existing collection', 'existing-collection')
  .row()
  .text('Mint new Footstep SBT', 'mint-footstep')
  .row()
  .text('Create new template', 'create-new-template')
  .row()
  .text('Use template', 'use-template')
  .row()
  .text('👨‍🏫 See tutorials', 'tutorials')
  .row()
  // .text('🚫 Revoke SBT reward', 'revoke-sbt-reward')
  // .row()
  .text('Cancel', 'cancel');

export const templatesMenu = (templates: Template[], userId: string) => {
  const menu = new InlineKeyboard();
  const config = loadConfigFromEnv();
  for (const template of templates) {
    if (
      template.userIds.includes(userId) ||
      Number(userId) === Number(config.bot.adminId)
    ) {
      menu.text(template.name, `template-${template.id}`).row();
    }
  }
  return menu;
};

export const approveNewTemplateMenu = new InlineKeyboard()
  .text('Confirm', 'approve-new-template')
  .row()
  .text('Cancel', 'cancel');

export const existingCollectionMenu = new InlineKeyboard()
  .text('Enter new item data', 'existing-collection-new-data')
  .row()
  .text('Use previous item data', 'existing-collection-old-data');

export const confirmMintingMenu = new InlineKeyboard()
  .text('confirm', 'confirm-minting')
  .row()
  .text('cancel', 'cancel');

export const transferTONMenu = (receiver: string, amount: bigint) => {
  const baseText = `transfer/${receiver}?amount=${amount}`;
  const menu = new InlineKeyboard()
    .url('Tonkeeper', `https://app.tonkeeper.com/${baseText}`)
    .url('TonHub', `https://tonhub.com/${baseText}`)
    .row()
    .text('cancel', 'cancel');
  return { transferMenu: menu, basicUrl: `ton://${baseText}` };
};

export const cancelMenu = new InlineKeyboard().text('Cancel', 'cancel');

export const transactionSentMenu = new InlineKeyboard().text(
  'I sent transaction',
  'transaction-sent'
);

export const tutorialsMenu = new InlineKeyboard()
  .url('How to create an SBT collection?', 'https://youtu.be/Jj-zh9aJZMQ')
  .row()
  .url(
    'How to mint more SBTs into the collection?',
    'https://youtu.be/kooPs6ivdKc'
  )
  .row()
  .text('Cancel', 'cancel');
