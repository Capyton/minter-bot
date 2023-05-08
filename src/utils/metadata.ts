import { readFile } from 'fs/promises';
import { uploadFileToS3 } from './files';

type CollectionMetadata = {
  name: string;
  description: string;
  imagePathname: string;
  coverImagePathname: string;
};

type ItemMetadata = {
  name: string;
  description: string;
  imagePath: string;
};

export async function createMetadataFile(
  itemsData: ItemMetadata,
  collectionName: string
) {
  const imageContent = await readFile(itemsData.imagePath);
  const itemPhoto = await uploadFileToS3(
    imageContent,
    'itemImage.jpg',
    collectionName
  );
  const metadata = {
    image: itemPhoto,
    description: itemsData.description,
    name: itemsData.name,
  };
  const metadataContent = Buffer.from(JSON.stringify(metadata));
  const fileURL = await uploadFileToS3(
    metadataContent,
    'item.json',
    collectionName
  );
  return fileURL;
}

export async function createCollectionMetadata(
  collectionData: CollectionMetadata
) {
  const collectionImageContent = await readFile(collectionData.imagePathname);
  const collectionCoverImageContent = await readFile(
    collectionData.coverImagePathname
  );

  const collectionImageURL = await uploadFileToS3(
    collectionImageContent,
    'logo.jpg',
    collectionData.name
  );
  const collectionCoverImageURL = await uploadFileToS3(
    collectionCoverImageContent,
    'cover.jpg',
    collectionData.name
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
    collectionData.name
  );
  return fileURL;
}
