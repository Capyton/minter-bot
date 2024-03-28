import { InputFile } from 'grammy';
import { Address, fromNano, toNano } from 'ton-core';
import { transactionSentMenu, transferTONMenu } from '@/menus';
import { openWallet } from '@/utils/wallet';
import { generateQRCode } from '@/utils/qr';
import { Context, Conversation } from '@/types';
import { NftCollection } from '@/contracts/NftCollection';

export const startPaymentFlow = async (
  conversation: Conversation,
  ctx: Context,
  addresses: Address[] = [],
  collectionAddress?: Address
): Promise<Context> => {
  console.log('Start payment flow');
  const wallet = await openWallet();
  const receiverAddress = wallet.contract.address.toString();

  let tonAmount = toNano('0.05') * BigInt(addresses.length);

  if (collectionAddress) {
    tonAmount = await conversation.external(
      async () =>
        await NftCollection.getBatchMintingFeesAmount(
          collectionAddress,
          addresses.length
        )
    );
  }

  let currentBalance = await conversation.external(
    async () => await wallet.contract.getBalance()
  );

  if (currentBalance > tonAmount) {
    return ctx;
  }

  const topUpAmount = tonAmount - currentBalance + toNano('0.1');

  const { transferMenu, basicUrl } = transferTONMenu(
    receiverAddress,
    topUpAmount
  );
  const qrcodeBuffer = await generateQRCode(basicUrl);

  const paymentInfoMsg = await ctx.replyWithPhoto(new InputFile(qrcodeBuffer), {
    caption: `It remains just to replenish the wallet, to do this send ${fromNano(
      topUpAmount
    )} TON to the <code>${receiverAddress.toString()}</code> by clicking the button below.`,
    parse_mode: 'HTML',
    reply_markup: transferMenu,
  });

  const confirmPayment = await ctx.reply(
    'Click this button when you send the transaction',
    {
      reply_markup: transactionSentMenu,
    }
  );
  ctx = await conversation.waitForCallbackQuery('transaction-sent');

  currentBalance = await wallet.contract.getBalance();

  while (currentBalance + toNano('0.1') <= tonAmount) {
    await ctx.answerCallbackQuery(
      "I haven't received your payment! Try to wait ~1 minute, if you actually sent transaction."
    );
    ctx = await conversation.waitForCallbackQuery('transaction-sent');
    currentBalance = await wallet.contract.getBalance();
  }

  await paymentInfoMsg.delete();
  await confirmPayment.delete();

  return ctx;
};
