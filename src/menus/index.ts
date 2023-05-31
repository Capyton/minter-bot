import { InlineKeyboard } from 'grammy';
import { toNano } from 'ton-core';

const baseFlowMenu = new InlineKeyboard()
  .text('Create new collection', 'new-collection')
  .row()
  .text('Use existing collection', 'existing-collection')
  .row()
  .text('Mint new Footstep SBT', 'mint-footstep')
  .row()
  .text('Cancel', 'cancel');

const existingCollectionMenu = new InlineKeyboard()
  .text('Enter new item data', 'existing-collection-new-data')
  .row()
  .text('Use previous item data', 'existing-collection-old-data');

const confirmMintingMenu = new InlineKeyboard()
  .text('confirm', 'confirm-minting')
  .row()
  .text('cancel', 'cancel');

const transferTONMenu = (receiver: string, amount: string) => {
  const menu = new InlineKeyboard()
    .url('Tonkeeper', `ton://transfer/${receiver}?amount=${toNano(amount)}`)
    .row()
    .text('cancel', 'cancel');
  return menu;
};

const cancelMenu = new InlineKeyboard().text('Cancel', 'cancel');

const transactionSentMenu = new InlineKeyboard()
  .text('I sent transaction', 'transaction-sent')
  .row();

export {
  baseFlowMenu,
  confirmMintingMenu,
  transferTONMenu,
  transactionSentMenu,
  existingCollectionMenu,
  cancelMenu,
};
