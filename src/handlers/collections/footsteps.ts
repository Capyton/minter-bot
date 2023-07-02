import { hydrate } from '@grammyjs/hydrate';
import { InlineKeyboard } from 'grammy';
import { Address } from 'ton-core';
import { NftCollection } from '@/contracts/NftCollection';
import {
  baseFlowMenu,
  confirmMintingMenu,
  transactionSentMenu,
  transferTONMenu,
} from '@/menus';
import { Context, Conversation } from '@/types';
import { mintItems } from '@/utils/mintCollection';
import { openWallet } from '@/utils/wallet';
import { createMetadataFile } from '@/utils/metadata';
import { messageTemplate } from '.';

const getAddressesFromText = async (
  conversation: Conversation,
  ctx: Context
): Promise<Address[]> => {
  await ctx.reply(
    'Send addresses, which should receive SBT rewards according to this example:\n\nEQCD39VS5jcptHL8vMjEXrzGaRcCVYto7HUn4bpAOg8xqB2N, EQDaaxtmY6Dk0YzIV0zNnbUpbjZ92TJHBvO72esc0srwv8K2'
  );

  const addressesList = await conversation.form.text();

  try {
    const addresses: Address[] = [];
    for (const address of addressesList.replace(' ', '').split(',')) {
      if (address) {
        addresses.push(Address.parse(address));
      }
    }
    return addresses;
  } catch {
    await ctx.reply('Check correctness of your addresses and try again.');
    return await getAddressesFromText(conversation, ctx);
  }
};

export const mintNewFootstepSbt = async (
  conversation: Conversation,
  ctx: Context
) => {
  await conversation.run(hydrate());

  await ctx.deleteMessage();

  const collectionAddress = Address.parse(
    'EQCV8xVdWOV23xqOyC1wAv-D_H02f7gAjPzOlNN6Nv1ksVdL'
  );
  const itemPhoto =
    'https://sbt-bot-minter.s3.amazonaws.com/ton-footsteps/collection.png';

  await ctx.reply('Send link to the footstep issue from github:');
  const footstepLink = await conversation.form.text();

  const addresses = await getAddressesFromText(conversation, ctx);

  const footstepIndex = footstepLink.split('/').pop();

  const name = `TON Footstep #${footstepIndex}`;
  const description =
    'TON Footsteps are steps taken by TON Community on the path towards improving The Open Network.';

  const text =
    'Please confirm minting of the new Footsteps SBT Items based on this data\n' +
    messageTemplate('Item', name, description, addresses);

  await ctx.reply(text, {
    parse_mode: 'HTML',
    reply_markup: confirmMintingMenu,
  });
  ctx = await conversation.waitForCallbackQuery('confirm-minting');

  const wallet = await openWallet(
    process.env.MNEMONIC!.split(' '),
    Boolean(process.env.TESTNET!)
  );
  const receiverAddress = wallet.contract.address.toString();
  const tonAmount = (
    addresses.length * (0.035 + 0.03) +
    Math.ceil(addresses.length / 6) * 0.05 +
    0.2
  ).toFixed(3);

  await ctx.reply(
    `It remains just to replenish the wallet, to do this send ${tonAmount} TON to the <code>${receiverAddress.toString()}</code> by clicking the button below.`,
    {
      parse_mode: 'HTML',
      reply_markup: transferTONMenu(receiverAddress, tonAmount),
    }
  );

  await ctx.reply('Click this button when you send the transaction', {
    reply_markup: transactionSentMenu,
  });

  ctx = await conversation.waitForCallbackQuery('transaction-sent');
  await ctx.editMessageText('Start minting...', {
    reply_markup: new InlineKeyboard(),
  });
  const metadataFilename = `${footstepIndex}.json`;
  await createMetadataFile(
    {
      name,
      description,
      imagePath: undefined,
    },
    'ton-footsteps',
    '',
    metadataFilename,
    itemPhoto
  );
  const nextItemIndex =
    (await NftCollection.getLastNftIndex(collectionAddress)) + 1;
  await mintItems(
    ctx,
    wallet,
    addresses,
    collectionAddress,
    nextItemIndex,
    metadataFilename
  );
  await ctx.reply('Would you like to continue?', {
    reply_markup: baseFlowMenu,
  });
};
