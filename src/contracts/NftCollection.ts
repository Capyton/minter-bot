import {
  Address,
  Cell,
  internal,
  beginCell,
  contractAddress,
  StateInit,
  SendMode,
  toNano,
  Dictionary,
  DictionaryValue,
} from 'ton-core';
import { TonClient } from 'ton';
import { encodeOffChainContent } from '@/utils/metadata';
import { tonClient } from '@/utils/toncenter-client';
import { OpenedWallet } from '../utils/wallet';

export type CollectionData = {
  ownerAddress: Address;
  royaltyPercent: number;
  royaltyAddress: Address;
  nextItemIndex: number;
  collectionContentUrl: string;
  commonContentUrl: string;
};

export type CollectionMintItemInput = {
  passAmount: string;
  index: number;
  ownerAddress: Address;
  content: string;
  authorityAddress: Address;
};

const MintDictValue: DictionaryValue<CollectionMintItemInput> = {
  serialize(src, builder) {
    const nftItemMessage = beginCell();

    const itemContent = beginCell();
    itemContent.storeStringTail(src.content);

    nftItemMessage.storeAddress(src.ownerAddress);
    nftItemMessage.storeRef(itemContent);
    nftItemMessage.storeAddress(src.authorityAddress);
    nftItemMessage.storeUint(0, 64);

    builder.storeCoins(toNano(src.passAmount));
    builder.storeRef(nftItemMessage);
  },

  parse() {
    return {
      passAmount: '',
      index: 0,
      content: '',
      authorityAddress: new Address(0, Buffer.from([])),
      ownerAddress: new Address(0, Buffer.from([])),
      editorAddress: new Address(0, Buffer.from([])),
    };
  },
};

export class NftCollection {
  public wallet: OpenedWallet;
  public tonClient: TonClient;
  private data: CollectionData;

  constructor(
    data: CollectionData,
    wallet: OpenedWallet,
    tonClient: TonClient
  ) {
    this.data = data;
    this.wallet = wallet;
    this.tonClient = tonClient;
  }

  public async deploy(): Promise<number> {
    const seqno = await this.wallet.contract.getSeqno();

    await this.wallet.contract.sendTransfer({
      seqno,
      secretKey: this.wallet.keyPair.secretKey,
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

  static async deployItemsBatch(
    params: CollectionMintItemInput[],
    address: Address,
    wallet: OpenedWallet
  ): Promise<number> {
    const seqno = await wallet.contract.getSeqno();
    const amount = (0.03 * params.length + 0.1).toFixed(3);
    await wallet.contract.sendTransfer({
      seqno,
      secretKey: wallet.keyPair.secretKey,
      messages: [
        internal({
          value: amount.toString(),
          to: address,
          body: this.createBatchMintBody({ items: params }),
        }),
      ],
      sendMode: SendMode.IGNORE_ERRORS + SendMode.PAY_GAS_SEPARATELY,
    });
    return seqno;
  }

  static async topUpBalance(
    nftAmount: number,
    collectionAddress: Address,
    wallet: OpenedWallet
  ): Promise<number> {
    const seqno = await wallet.contract.getSeqno();

    const amount = (nftAmount * (0.035 + 0.03)).toFixed(3);
    await wallet.contract.sendTransfer({
      seqno,
      secretKey: wallet.keyPair.secretKey,
      messages: [
        internal({
          value: amount.toString(),
          to: collectionAddress.toString({ bounceable: false }),
          body: new Cell(),
        }),
      ],
      sendMode: SendMode.PAY_GAS_SEPARATELY + SendMode.IGNORE_ERRORS,
    });

    return seqno;
  }

  public async changeOwnership(newOwner: Address): Promise<number> {
    const seqno = await this.wallet.contract.getSeqno();
    const body = beginCell();

    body.storeUint(3, 32);
    body.storeUint(0, 64);
    body.storeAddress(newOwner);

    const amount = '0.03';

    await this.wallet.contract.sendTransfer({
      seqno,
      secretKey: this.wallet.keyPair.secretKey,
      messages: [
        internal({
          value: amount,
          to: this.address,
          body: body.endCell(),
        }),
      ],
      sendMode: SendMode.PAY_GAS_SEPARATELY + SendMode.IGNORE_ERRORS,
    });

    return seqno;
  }

  static async getName(collectionAddress: Address, client: TonClient) {
    const collectionData = await client.runMethod(
      collectionAddress,
      'get_collection_data'
    );
    collectionData.stack.readNumber();
    const collectionMetadataURL = collectionData.stack.readString();
    const response = await fetch(collectionMetadataURL);
    const metadata = await response.json();
    return metadata.name;
  }

  static createBatchMintBody(params: {
    items: CollectionMintItemInput[];
  }): Cell {
    const itemsDict = Dictionary.empty(Dictionary.Keys.Uint(64), MintDictValue);

    for (const item of params.items) {
      itemsDict.set(item.index, item);
    }

    const body = beginCell();

    body.storeUint(2, 32);
    body.storeUint(0, 64);
    body.storeDict(itemsDict);

    return body.endCell();
  }

  static async getImage(collectionAddress: Address, tonClient: TonClient) {
    const collectionData = await tonClient.runMethod(
      collectionAddress,
      'get_collection_data'
    );

    collectionData.stack.readNumber();
    const collectionContentUrl = collectionData.stack.readString();
    const response = await fetch(collectionContentUrl);
    const data = await response.json();

    return data.image;
  }

  static async getLastNftIndex(
    collectionAddress: Address,
    tonClient: TonClient
  ) {
    const collectionData = await tonClient.runMethod(
      collectionAddress,
      'get_collection_data'
    );
    const lastNftIndex = collectionData.stack.readNumber() - 1;
    return lastNftIndex;
  }

  static async getLastNftMetadata(
    collectionAddress: Address,
    tonClient: TonClient
  ) {
    const lastNftIndex = await NftCollection.getLastNftIndex(
      collectionAddress,
      tonClient
    );

    const lastNftAddress = (
      await tonClient.runMethod(collectionAddress, 'get_nft_address_by_index', [
        { type: 'int', value: BigInt(lastNftIndex) },
      ])
    ).stack.readAddress();

    const lastNftData = await tonClient.runMethod(
      lastNftAddress,
      'get_nft_data'
    );
    lastNftData.stack.skip(4);

    const lastNftContent = lastNftData.stack.readCell();

    const nftContent = await tonClient.runMethod(
      collectionAddress,
      'get_nft_content',
      [
        { type: 'int', value: BigInt(lastNftIndex) },
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

    return { metadata, metadataURL };
  }

  static async isOwner(
    collectionAddress: Address,
    walletAddress: Address
  ): Promise<boolean> {
    try {
      const collectionData = await tonClient.runMethod(
        collectionAddress,
        'get_collection_data'
      );
      collectionData.stack.pop();
      collectionData.stack.pop();
      const ownerAddress = collectionData.stack.readAddress();
      return ownerAddress.equals(walletAddress);
    } catch {
      return false;
    }
  }

  static async revokeSbtReward(
    sbtAddress: Address,
    wallet: OpenedWallet
  ): Promise<number> {
    const seqno = await wallet.contract.getSeqno();
    const body = beginCell();

    body.storeUint(0x6f89f5e3, 32);
    body.storeUint(0, 64);

    const amount = '0.03';

    await wallet.contract.sendTransfer({
      seqno,
      secretKey: wallet.keyPair.secretKey,
      messages: [
        internal({
          value: amount,
          to: sbtAddress,
          body: body.endCell(),
        }),
      ],
      sendMode: SendMode.PAY_GAS_SEPARATELY + SendMode.IGNORE_ERRORS,
    });
    return seqno;
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

    const collectionContent = encodeOffChainContent(data.collectionContentUrl);

    const commonContent = encodeOffChainContent(data.commonContentUrl, false);

    contentCell.storeRef(collectionContent);
    contentCell.storeRef(commonContent);
    dataCell.storeRef(contentCell);

    const NftItemCodeCell = Cell.fromBase64(
      'te6ccgECEwEAAzsAART/APSkE/S88sgLAQIBYgIDAgLOBAUCASAPEAS9RsIiDHAJFb4AHQ0wP6QDDwAvhCs44cMfhDAccF8uGV+kAB+GTUAfhm+kAw+GVw+GfwA+AC0x8CcbDjAgHTP4IQ0MO/6lIwuuMCghAE3tFIUjC64wIwghAvyyaiUiC6gGBwgJAgEgDQ4AlDAx0x+CEAUkx64Suo450z8wgBD4RHCCEMGOhtJVA22AQAPIyx8Syz8hbrOTAc8XkTHiyXEFyMsFUATPFlj6AhPLaszJAfsAkTDiAMJsEvpA1NMAMPhH+EHIy/9QBs8W+ETPFhLMFMs/UjDLAAPDAJb4RlADzALegBB4sXCCEA3WB+NANRSAQAPIyx8Syz8hbrOTAc8XkTHiyXEFyMsFUATPFlj6AhPLaszJAfsAAMYy+ERQA8cF8uGR+kDU0wAw+Ef4QcjL//hEzxYTzBLLP1IQywABwwCU+EYBzN6AEHixcIIQBSTHrkBVA4BAA8jLHxLLPyFus5MBzxeRMeLJcQXIywVQBM8WWPoCE8tqzMkB+wAD+o5AMfhByMv/+EPPFoAQcIIQi3cXNUAVUEQDgEADyMsfEss/IW6zkwHPF5Ex4slxBcjLBVAEzxZY+gITy2rMyQH7AOCCEB8EU3pSILrjAoIQb4n141Iguo4WW/hFAccF8uGR+EfAAPLhk/gj+GfwA+CCENE207NSILrjAjAxCgsMAJIx+EQixwXy4ZGAEHCCENUydtsQJFUCbYMGA8jLHxLLPyFus5MBzxeRMeLJcQXIywVQBM8WWPoCE8tqzMkB+wCLAvhkiwL4ZfADAI4x+EQixwXy4ZGCCvrwgHD7AoAQcIIQ1TJ22xAkVQJtgwYDyMsfEss/IW6zkwHPF5Ex4slxBcjLBVAEzxZY+gITy2rMyQH7AAAgghBfzD0UupPywZ3ehA/y8ABhO1E0NM/Afhh+kAB+GNw+GIg10nCAI4Wf/hi+kAB+GTUAfhm+kAB+GXTPzD4Z5Ew4oAA3PhH+Eb4QcjLP/hDzxb4RM8WzPhFzxbLP8ntVIAIBWBESAB28fn+AF8IXwg/CH8InwjQADbVjHgBfCLAADbewfgBfCPA='
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
