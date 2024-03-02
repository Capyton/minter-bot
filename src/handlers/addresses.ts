import path from 'path';
import * as fs from 'fs/promises';
import { InputFile } from 'grammy';
import { Address } from 'ton-core';
import { Context, Conversation } from '@/types';
import { downloadFile } from '@/utils/files';
import { cancelMenu } from '@/menus';
import { openWallet } from '@/utils/wallet';
import { NftCollection } from '@/contracts/NftCollection';

export function isAddress(address: string) {
  try {
    Address.parse(address);
    return true;
  } catch {
    return false;
  }
}

export const parseAddresses = async (text: string): Promise<Address[]> => {
  const addressesString: Set<string> = new Set();
  const addresses: Address[] = [];
  for (let stringAddress of text.split('\n')) {
    if (
      isAddress(stringAddress) ||
      stringAddress.endsWith('.ton') ||
      stringAddress.endsWith('.t.me')
    ) {
      if (stringAddress.endsWith('.ton') || stringAddress.endsWith('.t.me')) {
        const response = await fetch(
          `https://tonapi.io/v2/dns/${stringAddress}/resolve`,
          { headers: { Authorization: `Bearer ${process.env.TONAPI_API_KEY}` } }
        );
        const dnsResolved = await response.json();
        if (dnsResolved['error']) {
          continue;
        }
        stringAddress = dnsResolved.wallet.address;
      }
      const address = Address.parse(stringAddress);
      if (!addressesString.has(address.toRawString())) {
        addressesString.add(address.toRawString());
        addresses.push(address);
      }
    }
  }
  return addresses;
};

export const getCollectionAddress = async (
  ctx: Context,
  conversation: Conversation
): Promise<Address> => {
  const minterWallet = await openWallet();
  const enterCollectionAddrMsg = await ctx.reply('Enter collection address: ', {
    reply_markup: cancelMenu,
  });

  const collectionAddressCtx = await conversation.waitFor(':text');
  if (
    !isAddress(collectionAddressCtx.message!.text) ||
    !(await NftCollection.isOwner(
      Address.parse(collectionAddressCtx.message!.text),
      minterWallet.contract.address
    ))
  ) {
    await ctx.reply(
      'Check the correctness of the entered address and try again.'
    );
    return await getCollectionAddress(ctx, conversation);
  }
  await collectionAddressCtx.message?.delete();
  await enterCollectionAddrMsg.delete();
  return Address.parse(collectionAddressCtx.message!.text);
};

export const getAddresses = async (
  conversation: Conversation,
  ctx: Context
): Promise<Address[]> => {
  const explanationCaptionText = `Upload the file with addresses which must receive NFT (example above)

Or just send a text with the addresses separated by a new line.

<b>Note that you can't send more than 80 addresses using simple text message!</b>

See an example of a correct text message with addresses below:`;

  await ctx.replyWithDocument(new InputFile('./src/assets/example.txt'), {
    caption: explanationCaptionText,
    reply_markup: cancelMenu,
    parse_mode: 'HTML',
  });

  const exampleText = `
UQCD39VS5jcptHL8vMjEXrzGaRcCVYto7HUn4bpAOg8xqEBI
UQBmzW4wYlFW0tiBgj5sP1CgSlLdYs-VpjPWM7oPYPYWQBqW
EQDtFpEwcFAEcRe5mLVh2N6C0x-_hJEM7W61_JLnSF74p4q2
  `;
  await ctx.reply(exampleText);

  const responseCtx = await conversation.wait();

  if (responseCtx.message?.document) {
    const pathname = await downloadFile(responseCtx, 'document', 'addresses');
    const addressesFromFile = await fs.readFile(
      path.join(pathname, 'addresses')
    );
    return await parseAddresses(addressesFromFile.toString());
  } else if (responseCtx.message?.text) {
    const addressesText = responseCtx.message.text;
    return await parseAddresses(addressesText);
  }

  return await getAddresses(conversation, ctx);
};

export const getAddressesFromText = async (
  conversation: Conversation,
  ctx: Context,
  text: string
): Promise<Address[]> => {
  await ctx.reply(text, { reply_markup: cancelMenu });
  const addressesList = await conversation.form.text();
  const addresses: Address[] = [];
  try {
    for (const address of addressesList.replace(' ', '').split(',')) {
      if (address) {
        addresses.push(Address.parse(address));
      }
    }
    return addresses;
  } catch {
    await ctx.reply('Check correctness of your addresses and try again.');
    return await getAddressesFromText(conversation, ctx, text);
  }
};
