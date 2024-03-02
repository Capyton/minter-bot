import { InputFile } from 'grammy';
import { Address, fromNano } from 'ton-core';
import { transactionSentMenu, transferTONMenu } from '@/menus';
import { openWallet } from '@/utils/wallet';
import { generateQRCode } from '@/utils/qr';
import { Context, Conversation } from '@/types';

export const startPaymentFlow = async (
  conversation: Conversation,
  ctx: Context,
  addresses: Address[] = []
) => {
  const wallet = await openWallet();
  const receiverAddress = wallet.contract.address.toString();

  const tonAmount = (
    addresses.length * 0.03 +
    Math.ceil(addresses.length / 6) * 0.12 +
    0.05
  ).toFixed(3);

  let currentBalance = fromNano(await wallet.contract.getBalance());

  if (parseFloat(currentBalance) > parseFloat(tonAmount)) {
    return ctx;
  }

  const { transferMenu, basicUrl } = transferTONMenu(
    receiverAddress,
    tonAmount
  );
  const qrcodeBuffer = await generateQRCode(basicUrl);

  const paymentInfoMsg = await ctx.replyWithPhoto(new InputFile(qrcodeBuffer), {
    caption: `It remains just to replenish the wallet, to do this send ${tonAmount} TON to the <code>${receiverAddress.toString()}</code> by clicking the button below.`,
    parse_mode: 'HTML',
    reply_markup: transferMenu,
  });

  const confirmPayment = await ctx.reply(
    'Click this button when you send the transaction',
    {
      reply_markup: transactionSentMenu,
    }
  );

  while (
    parseFloat(currentBalance) + parseFloat('0.1') <=
    parseFloat(tonAmount)
  ) {
    ctx = await conversation.waitForCallbackQuery('transaction-sent');
    currentBalance = fromNano(await wallet.contract.getBalance());

    if (
      parseFloat(currentBalance) + parseFloat('0.1') <=
      parseFloat(tonAmount)
    ) {
      await ctx.answerCallbackQuery(
        "I haven't received your payment! Try to wait ~1 minute, if you actually sent transaction."
      );
    }
  }
  await paymentInfoMsg.delete();
  await confirmPayment.delete();
  return ctx;
};
