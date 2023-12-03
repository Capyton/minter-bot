import { InlineKeyboard } from 'grammy';
import { toNano } from 'ton-core';

const baseFlowMenu = new InlineKeyboard()
  .text('Create new collection', 'new-collection')
  .row()
  .text('Create new empty collection', 'new-empty-collection')
  .row()
  .text('Use existing collection', 'existing-collection')
  .row()
  .text('Mint new Footstep SBT', 'mint-footstep')
  .row()
  .text('👨‍🏫 See tutorials', 'tutorials')
  .row()
  // .text('🚫 Revoke SBT reward', 'revoke-sbt-reward')
  // .row()
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
  const baseText = `transfer/${receiver}?amount=${toNano(amount)}`;
  const menu = new InlineKeyboard()
    .url('Tonkeeper', `https://app.tonkeeper.com/${baseText}`)
    .url('TonHub', `https://tonhub.com/${baseText}`)
    .row()
    .text('cancel', 'cancel');
  return menu;
};

const cancelMenu = new InlineKeyboard().text('Cancel', 'cancel');

const transactionSentMenu = new InlineKeyboard()
  .text('I sent transaction', 'transaction-sent')
  .row();

const tutorialsMenu = new InlineKeyboard()
  .url('How to create an SBT collection?', 'https://youtu.be/Jj-zh9aJZMQ')
  .row()
  .url(
    'How to mint more SBTs into the collection?',
    'https://youtu.be/kooPs6ivdKc'
  )
  .row()
  .text('Cancel', 'cancel');

export {
  baseFlowMenu,
  confirmMintingMenu,
  transferTONMenu,
  transactionSentMenu,
  existingCollectionMenu,
  tutorialsMenu,
  cancelMenu,
};
