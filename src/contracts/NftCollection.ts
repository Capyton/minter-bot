import { TonClient } from 'ton';
import {
  Address,
  Cell,
  internal,
  beginCell,
  contractAddress,
  StateInit,
  SendMode,
} from 'ton-core';
import { OpenedWallet } from '../utils/wallet';

export type collectionData = {
  ownerAddress: Address;
  royaltyPercent: number;
  royaltyAddress: Address;
  nextItemIndex: number;
  collectionContentUrl: string;
  commonContentUrl: string;
};

export type mintParams = {
  queryId: number;
  itemOwnerAddress: Address;
  itemIndex: number;
  amount: bigint;
  commonContentUrl: string;
  authorityAddress: Address;
};

export class NftCollection {
  private data: collectionData;

  constructor(data: collectionData) {
    this.data = data;
  }

  public async deploy(wallet: OpenedWallet): Promise<number> {
    const seqno = await wallet.contract.getSeqno();
    await wallet.contract.sendTransfer({
      seqno,
      secretKey: wallet.keyPair.secretKey,
      messages: [
        internal({
          value: '0.05',
          to: this.address,
          init: this.stateInit,
        }),
      ],
      sendMode: SendMode.PAY_GAS_SEPARATELY + SendMode.IGNORE_ERRORS,
    });
    return seqno;
  }

  public async deployItem(
    wallet: OpenedWallet,
    params: mintParams
  ): Promise<number> {
    const seqno = await wallet.contract.getSeqno();
    await wallet.contract.sendTransfer({
      seqno,
      secretKey: wallet.keyPair.secretKey,
      messages: [
        internal({
          value: '0.05',
          to: this.address,
          body: this.createMintBody(params),
        }),
      ],
      sendMode: SendMode.IGNORE_ERRORS + SendMode.PAY_GAS_SEPARATELY,
    });
    return seqno;
  }

  public async topUpBalance(
    wallet: OpenedWallet,
    nftAmount: number
  ): Promise<number> {
    const seqno = await wallet.contract.getSeqno();

    const amount = nftAmount * 0.026;

    await wallet.contract.sendTransfer({
      seqno,
      secretKey: wallet.keyPair.secretKey,
      messages: [
        internal({
          value: amount.toString(),
          to: this.address.toString({ bounceable: false }),
          body: new Cell(),
        }),
      ],
      sendMode: SendMode.PAY_GAS_SEPARATELY + SendMode.IGNORE_ERRORS,
    });

    return seqno;
  }

  public createMintBody(params: mintParams): Cell {
    const body = beginCell();
    body.storeUint(1, 32);
    body.storeUint(params.queryId || 0, 64);
    body.storeUint(params.itemIndex, 64);
    body.storeCoins(params.amount);

    const nftItemContent = beginCell();
    nftItemContent.storeAddress(params.itemOwnerAddress);
    const uriContent = beginCell();
    uriContent.storeBuffer(Buffer.from(params.commonContentUrl));
    nftItemContent.storeRef(uriContent.endCell());
    nftItemContent.storeAddress(params.authorityAddress);
    nftItemContent.storeUint(0, 64);

    body.storeRef(nftItemContent.endCell());
    return body.endCell();
  }

  static async getLastNftMetadata(collectionAddress: Address) {
    const client = new TonClient({
      endpoint: 'https://toncenter.com/api/v2/jsonRPC',
      apiKey: process.env.TONCENTER_API_KEY,
    });

    const collectionData = await client.runMethod(
      collectionAddress,
      'get_collection_data'
    );
    const lastNftIndex = collectionData.stack.readBigNumber() - 1n;

    const lastNftAddress = (
      await client.runMethod(collectionAddress, 'get_nft_address_by_index', [
        { type: 'int', value: lastNftIndex },
      ])
    ).stack.readAddress();

    const lastNftData = await client.runMethod(lastNftAddress, 'get_nft_data');
    lastNftData.stack.skip(4);

    const lastNftContent = lastNftData.stack.readCell();

    const nftContent = await client.runMethod(
      collectionAddress,
      'get_nft_content',
      [
        { type: 'int', value: lastNftIndex },
        { type: 'cell', cell: lastNftContent },
      ]
    );
    const commonContent = nftContent.stack.readCell().asSlice();
    commonContent.loadUint(8);
    commonContent.loadStringRefTail();

    const metadataURL =
      commonContent.loadStringTail() +
      lastNftContent.beginParse().loadStringTail();

    const response = await fetch(metadataURL);
    const metadata = await response.json();
    return metadata;
  }

  public get stateInit(): StateInit {
    const code = this.createCodeCell();
    const data = this.createDataCell();

    return { code, data };
  }

  public get address(): Address {
    return contractAddress(0, this.stateInit);
  }

  private createCodeCell(): Cell {
    const NftCollectionCodeBoc =
      'te6cckECFAEAAh8AART/APSkE/S88sgLAQIBYgkCAgEgBAMAJbyC32omh9IGmf6mpqGC3oahgsQCASAIBQIBIAcGAC209H2omh9IGmf6mpqGAovgngCOAD4AsAAvtdr9qJofSBpn+pqahg2IOhph+mH/SAYQAEO4tdMe1E0PpA0z/U1NQwECRfBNDUMdQw0HHIywcBzxbMyYAgLNDwoCASAMCwA9Ra8ARwIfAFd4AYyMsFWM8WUAT6AhPLaxLMzMlx+wCAIBIA4NABs+QB0yMsCEsoHy//J0IAAtAHIyz/4KM8WyXAgyMsBE/QA9ADLAMmAE59EGOASK3wAOhpgYC42Eit8H0gGADpj+mf9qJofSBpn+pqahhBCDSenKgpQF1HFBuvgoDoQQhUZYBWuEAIZGWCqALnixJ9AQpltQnlj+WfgOeLZMAgfYBwGyi544L5cMiS4ADxgRLgAXGBEuAB8YEYGYHgAkExIREAA8jhXU1DAQNEEwyFAFzxYTyz/MzMzJ7VTgXwSED/LwACwyNAH6QDBBRMhQBc8WE8s/zMzMye1UAKY1cAPUMI43gED0lm+lII4pBqQggQD6vpPywY/egQGTIaBTJbvy9AL6ANQwIlRLMPAGI7qTAqQC3gSSbCHis+YwMlBEQxPIUAXPFhPLP8zMzMntVABgNQLTP1MTu/LhklMTugH6ANQwKBA0WfAGjhIBpENDyFAFzxYTyz/MzMzJ7VSSXwXiN0CayQ==';
    return Cell.fromBase64(NftCollectionCodeBoc);
  }

  private createDataCell(): Cell {
    const data = this.data;
    const dataCell = beginCell();

    dataCell.storeAddress(data.ownerAddress);
    dataCell.storeUint(data.nextItemIndex, 64);

    const contentCell = beginCell();

    const collectionContent = beginCell();
    collectionContent.storeStringTail(data.collectionContentUrl);

    const commonContent = beginCell();
    commonContent.storeStringTail(data.commonContentUrl);

    contentCell.storeRef(collectionContent.asCell());
    contentCell.storeRef(commonContent.asCell());
    dataCell.storeRef(contentCell);

    const NftItemCodeCell = Cell.fromBase64(
      'te6cckECEgEAA1cAART/APSkE/S88sgLAQIBYgIDAgLOBAUCASAODwS9RsIiDHAJFb4AHQ0wP6QDDwAvhCs44cMfhDAccF8uGV+kAB+GTUAfhm+kAw+GVw+GfwA+AC0x8CcbDjAgHTP4IQ0MO/6lIwuuMCghAE3tFIUjC64wIwghAvyyaiUiC6gGBwgJAgEgDA0AnjAx0x+CEAUkx64Suo4+0z8wgBD4RHCCEMGOhtJVA22AQAPIyx9SIMs/IW6zkwHPF5Ex4slxBsjLBVAFzxZQA/oCFMtqEszLP8kB+wCRMOIAzGwS+kDU0wAw+Ef4QcjL/1AGzxb4RM8WEswUyz9SMMsAA8MAlvhGUAPMAt6AEHixcIIQDdYH40A1FIBAA8jLH1Igyz8hbrOTAc8XkTHiyXEGyMsFUAXPFlAD+gIUy2oSzMs/yQH7AADQMvhEUAPHBfLhkfpA1NMAMPhH+EHIy//4RM8WE8wSyz9SEMsAAcMAlPhGAczegBB4sXCCEAUkx65AVQOAQAPIyx9SIMs/IW6zkwHPF5Ex4slxBsjLBVAFzxZQA/oCFMtqEszLP8kB+wAC/I5FMfhByMv/+EPPFoAQcIIQi3cXNUAVUEQDgEADyMsfUiDLPyFus5MBzxeRMeLJcQbIywVQBc8WUAP6AhTLahLMyz/JAfsA4IIQHwRTelIguuMCghBvifXjUiC6jhZb+EUBxwXy4ZH4R8AA8uGT+CP4Z/AD4IIQ0TbTs1IgugoLAJwx+EQixwXy4ZGAEHCCENUydtsQJFUCbYMGA8jLH1Igyz8hbrOTAc8XkTHiyXEGyMsFUAXPFlAD+gIUy2oSzMs/yQH7AIsC+GSLAvhl8AMAwo5MMfhEIscF8uGRggr68IBw+wKAEHCCENUydtsQJFUCbYMGA8jLH1Igyz8hbrOTAc8XkTHiyXEGyMsFUAXPFlAD+gIUy2oSzMs/yQH7AOAwMYIQX8w9FLqT8sGd3oQP8vAAYTtRNDTPwH4YfpAAfhjcPhiINdJwgCOFn/4YvpAAfhk1AH4ZvpAAfhl0z8w+GeRMOKAANz4R/hG+EHIyz/4Q88W+ETPFsz4Rc8Wyz/J7VSACAVgQEQAdvH5/gBfCF8IPwh/CJ8I0AA21Yx4AXwiwAA23sH4AXwjwXmObfQ=='
    );
    dataCell.storeRef(NftItemCodeCell);

    const royaltyBase = 1000;
    const royaltyFactor = Math.floor(data.royaltyPercent * royaltyBase);

    const royaltyCell = beginCell();
    royaltyCell.storeUint(royaltyFactor, 16);
    royaltyCell.storeUint(royaltyBase, 16);
    royaltyCell.storeAddress(data.royaltyAddress);
    dataCell.storeRef(royaltyCell);

    return dataCell.endCell();
  }
}
