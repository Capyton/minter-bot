import { readFile } from 'fs/promises';
import { beginCell, Cell } from 'ton-core';
import { uploadFileToS3 } from './files';
import { randomString } from './random';

type CollectionMetadata = {
  name: string;
  description: string;
  imagePathname: string;
  coverImagePathname: string;
};

type ItemMetadata = {
  name: string;
  description: string;
  imagePath: string | undefined;
};

export async function createItemMetadataFile(
  itemsData: ItemMetadata,
  folderName: string,
  itemImageFilename = 'itemImage',
  metadataFilename = 'item.json',
  itemPhoto: string | undefined = undefined,
  collectionImage: string | undefined = undefined
) {
  if (!itemPhoto) {
    const imageContent = await readFile(itemsData.imagePath!);
    if (itemsData.imagePath?.endsWith('mp4')) {
      itemImageFilename += '.mp4';
    } else {
      itemImageFilename += '.jpg';
    }
    itemPhoto = await uploadFileToS3(
      imageContent,
      itemImageFilename,
      folderName
    );
  }
  let metadata: any = {};
  if (itemImageFilename.includes('.mp4')) {
    metadata = {
      image: collectionImage,
      description: itemsData.description,
      name: itemsData.name,
      content_url: itemPhoto,
      content_type: 'video/mp4',
    };
  } else {
    metadata = {
      image: itemPhoto,
      description: itemsData.description,
      name: itemsData.name,
    };
  }
  metadata['buttons'] = [
    {
      label: 'Open in TON Society',
      uri: 'https://society.ton.org/welcome',
    },
  ];
  const metadataContent = Buffer.from(JSON.stringify(metadata));
  const fileURL = await uploadFileToS3(
    metadataContent,
    metadataFilename,
    folderName
  );
  return fileURL;
}

export async function createCollectionMetadata(
  collectionData: CollectionMetadata
) {
  const folderName = `${collectionData.name}-${randomString()}`;

  const collectionImageContent = await readFile(collectionData.imagePathname);
  const collectionCoverImageContent = await readFile(
    collectionData.coverImagePathname
  );

  const collectionImageURL = await uploadFileToS3(
    collectionImageContent,
    'logo.jpg',
    folderName
  );
  const collectionCoverImageURL = await uploadFileToS3(
    collectionCoverImageContent,
    'cover.jpg',
    folderName
  );

  const metadata = {
    name: collectionData.name,
    description: collectionData.description,
    cover_image: collectionCoverImageURL,
    image: collectionImageURL,
  };
  const metadataContent = Buffer.from(JSON.stringify(metadata));
  const fileURL = await uploadFileToS3(
    metadataContent,
    'collection.json',
    folderName
  );
  return { collectionContent: { url: fileURL, data: metadata }, folderName };
}
function bufferToChunks(buff: Buffer, chunkSize: number) {
  const chunks: Buffer[] = [];
  while (buff.byteLength > 0) {
    chunks.push(buff.slice(0, chunkSize));
    buff = buff.slice(chunkSize);
  }
  return chunks;
}

function makeSnakeCell(data: Buffer): Cell {
  const chunks = bufferToChunks(data, 127);

  if (chunks.length === 0) {
    return beginCell().endCell();
  }

  if (chunks.length === 1) {
    return beginCell().storeBuffer(chunks[0]).endCell();
  }

  let curCell = beginCell();

  for (let i = chunks.length - 1; i >= 0; i--) {
    const chunk = chunks[i];

    curCell.storeBuffer(chunk);

    if (i - 1 >= 0) {
      const nextCell = beginCell();
      nextCell.storeRef(curCell);
      curCell = nextCell;
    }
  }

  return curCell.endCell();
}

export function encodeOffChainContent(content: string, usePrefix?: boolean) {
  let data = Buffer.from(content);
  if (usePrefix === undefined) {
    const offChainPrefix = Buffer.from([0x01]);
    data = Buffer.concat([offChainPrefix, data]);
  }
  return makeSnakeCell(data);
}
