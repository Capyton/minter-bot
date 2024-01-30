import { InputFile } from 'grammy';
import { Address } from 'ton-core';
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
    addresses.length * 0.03 
    + Math.ceil(addresses.length / 6) * 0.12
    + 0.05
  )

  const { transferMenu, basicUrl } = transferTONMenu(
    receiverAddress,
    tonAmount
  );
  const qrcodeBuffer = await generateQRCode(basicUrl);

  await ctx.replyWithPhoto(new InputFile(qrcodeBuffer), {
    caption: `It remains just to replenish the wallet, to do this send ${tonAmount} TON to the <code>${receiverAddress.toString()}</code> by clicking the button below.`,
    parse_mode: 'HTML',
    reply_markup: transferMenu,
  });

  await ctx.reply('Click this button when you send the transaction', {
    reply_markup: transactionSentMenu,
  });

  ctx = await conversation.waitForCallbackQuery('transaction-sent');
  return ctx;
};
