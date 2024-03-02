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

export async function callForSuccess<T extends (...args: any[]) => any>(
  toCall: T,
  attempts = 20,
  delayMs = 100
): Promise<ReturnType<T>> {
  if (typeof toCall !== 'function') {
      throw new Error('unknown input')
  }

  let i = 0
  let lastError: unknown

  while (i < attempts) {
      try {
          const res = await toCall()
          return res
      } catch (err) {
          lastError = err
          i++
          await sleep(delayMs)
      }
  }

  console.log('error after attempts', i)
  throw lastError
}