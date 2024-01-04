import { KeyPair, mnemonicToPrivateKey } from 'ton-crypto';
import { OpenedContract, WalletContractV3R2 } from 'ton';
import { tonClient } from './toncenter-client';

export type OpenedWallet = {
  contract: OpenedContract<WalletContractV3R2>;
  keyPair: KeyPair;
};

export async function openWallet() {
  const keyPair = await mnemonicToPrivateKey(process.env.MNEMONIC!.split(' '));

  const wallet = WalletContractV3R2.create({
    workchain: 0,
    publicKey: keyPair.publicKey,
  });

  const contract = tonClient.open(wallet);
  return { contract, keyPair };
}
