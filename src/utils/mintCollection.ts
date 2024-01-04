import { Address } from 'ton-core';
import { CollectionData, NftCollection } from '@/contracts/NftCollection';
import { sleep, waitSeqno } from '@/utils/delay';
import { openWallet } from '@/utils/wallet';
import { Context } from '@/types';
import { tonClient } from './toncenter-client';

export const mintCollection = async (
  ctx: Context,
  collectionData: CollectionData
): Promise<NftCollection> => {
  const minterWallet = await openWallet();
  const collection = new NftCollection(collectionData, minterWallet, tonClient);

  const seqno = await collection.deploy();
  await waitSeqno(seqno, minterWallet);

  await ctx.reply(
    `Collection deployed to <a href='https://getgems.io/collection/${collection.address}'>${collection.address}</a>`,
    { parse_mode: 'HTML' }
  );
  return collection;
};

export const mintItems = async (
  ctx: Context,
  addresses: Address[],
  collectionAddress: Address,
  startIndex = 0,
  contentUrl = 'item.json'
) => {
  const minterWallet = await openWallet();

  const items = [];

  let i = startIndex;

  for (const address of addresses) {
    items.push({
      index: i,
      passAmount: '0.03',
      ownerAddress: address,
      content: contentUrl,
      authorityAddress: minterWallet.contract.address,
    });
    i++;
  }

  const chunks = [];

  for (let i = 0; i < addresses.length; i += 6) {
    const chunk = items.slice(i, i + 6);

    chunks.push(chunk);
  }

  for (const chunk of chunks) {
    let isBatchDeployed = false;
    while (!isBatchDeployed) {
      try {
        const seqno = await NftCollection.deployItemsBatch(
          chunk,
          collectionAddress,
          minterWallet
        );
        await waitSeqno(seqno, minterWallet);
        isBatchDeployed = true;
      } catch (e) {
        console.error(e);
        await sleep(2000);
      }
    }
  }

  await ctx.reply(`${addresses.length} SBT items are successfully minted`);
};
