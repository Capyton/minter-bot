import { Address } from 'ton-core';
import { collectionData, NftCollection } from '@/contracts/NftCollection';
import { waitSeqno } from '@/utils/delay';
import { OpenedWallet } from '@/utils/wallet';
import { Context } from '@/types';

type Props = {
  collectionData: collectionData;
  wallet: OpenedWallet;
  addresses: Set<Address>;
};

export const mintCollection = async (
  ctx: Context,
  { collectionData, wallet, addresses }: Props
) => {
  const collection = new NftCollection(collectionData);

  let seqno = await collection.deploy(wallet);
  await waitSeqno(seqno, wallet);

  await ctx.reply(
    `Collection deployed to <a href='https://getgems.io/collection/${collection.address}'>${collection.address}</a>`,
    { parse_mode: 'HTML' }
  );

  seqno = await collection.topUpBalance(wallet, addresses.size);
  await waitSeqno(seqno, wallet);

  const items = [];

  let i = 0n;

  for (const address of addresses) {
    items.push({
      index: i,
      passAmount: '0.03',
      ownerAddress: address,
      content: 'item.json',
    });
    i++;
  }

  const chunks = [];

  for (let i = 0; i < addresses.size; i += 100) {
    const chunk = items.slice(i, i + 100);

    chunks.push(chunk);
  }

  for (const chuck of chunks) {
    seqno = await collection.deployItemsBatch(wallet, chuck);
    await waitSeqno(seqno, wallet);
  }

  await ctx.reply(`${addresses.size} SBT items are successfully minted`);
};
