import { hydrate } from '@grammyjs/hydrate';
import { Context, Conversation } from '@/types';
import { NftCollection } from '@/contracts/NftCollection';
import { openWallet } from '@/utils/wallet';
import { waitSeqno } from '@/utils/delay';
import { getAddressesFromText } from './addresses';

export const revokeSbtRewardHandler = async (
  conversation: Conversation,
  ctx: Context
) => {
  await conversation.run(hydrate());

  await ctx.deleteMessage();
  const addresses = await getAddressesFromText(
    conversation,
    ctx,
    'Send the SBT addresses that you want to revoke according to this example:\n\nEQCD39VS5jcptHL8vMjEXrzGaRcCVYto7HUn4bpAOg8xqB2N, EQDaaxtmY6Dk0YzIV0zNnbUpbjZ92TJHBvO72esc0srwv8K2'
  );
  await ctx.editMessageText('Start...');
  const minterWallet = await openWallet();
  for (const address of addresses) {
    const seqno = await NftCollection.revokeSbtReward(address, minterWallet);
    await waitSeqno(seqno, minterWallet);
  }
  await ctx.editMessageText('Done!');
};
