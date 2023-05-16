import { OpenedWallet } from './wallet';

export async function waitSeqno(seqno: number, wallet: OpenedWallet) {
  for (let attempt = 0; attempt < 1000; attempt++) {
    await sleep(2000);
    const seqnoAfter = await wallet.contract.getSeqno();
    if (seqnoAfter > seqno) break;
  }
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
