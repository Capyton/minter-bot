import { Address } from 'ton-core';
import { CollectionData, NftCollection } from '@/contracts/NftCollection';
import { sleep, waitSeqno } from '@/utils/delay';
import { OpenedWallet, openWallet } from '@/utils/wallet';
import { Context } from '@/types';

type Props = {
  collectionData: CollectionData;
  wallet: OpenedWallet;
};

export const mintCollection = async (
  ctx: Context,
  { collectionData, wallet }: Props
): Promise<NftCollection> => {
  const collection = new NftCollection(collectionData);

  const seqno = await collection.deploy(wallet);
  await waitSeqno(seqno, wallet);

  await ctx.reply(
    `Collection deployed to <a href='https://getgems.io/collection/${collection.address}'>${collection.address}</a>`,
    { parse_mode: 'HTML' }
  );
  return collection;
};

export const mintItems = async (
  ctx: Context,
  wallet: OpenedWallet,
  addresses: Address[],
  collectionAddress: Address,
  startIndex = 0,
  contentUrl = 'item.json'
) => {
  const minterWallet = await openWallet(
    process.env.MNEMONIC!.split(' '),
    Boolean(process.env.TESTNET!)
  );

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
          wallet,
          chunk,
          collectionAddress
        );
        await waitSeqno(seqno, wallet);
        isBatchDeployed = true;
      } catch (e) {
        console.error(e);
        await sleep(2000);
      }
    }
  }

  await ctx.reply(`${addresses.length} SBT items are successfully minted`);
};
