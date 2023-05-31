import path from 'path';
import { escape } from 'querystring';
import * as fs from 'fs/promises';
import { Address } from 'ton-core';
import download from 'download';
import AWS from 'aws-sdk';
import { Context } from '@/types';

type FileType = 'document' | 'photo';

export const getFileId = (ctx: Context, type: FileType): string => {
  if (type === 'document') {
    const document = ctx.message?.document;

    if (document) {
      return document.file_id;
    }
  }

  if (type === 'photo' && ctx.message?.photo) {
    const photo = ctx.message.photo.pop();
    return photo!.file_id;
  }

  return '';
};

const getFileUrl = (filePath: string) =>
  `https://api.telegram.org/file/bot${process.env.BOT_TOKEN}/${escape(
    filePath
  )}`;

export const downloadFile = async (
  ctx: Context,
  type: FileType,
  filename: string
): Promise<string> => {
  const pathname = path.resolve(`${__dirname}/../assets/`);

  const fileId = getFileId(ctx, type);
  const file = await ctx.api.getFile(fileId);

  if (file.file_path) {
    const url = getFileUrl(file.file_path);

    await download(url, pathname, { filename: filename });
  } else {
    throw new Error('File path does not exist');
  }

  return pathname;
};

export const getAddressesFromFile = async (
  filename: string
): Promise<Address[]> => {
  const addresses = [];

  const data = await fs.readFile(filename);

  for (const address of data.toString().split('\n')) {
    if (address) {
      addresses.push(Address.parse(address));
    }
  }
  return addresses;
};

export async function uploadFileToS3(
  fileContent: Buffer,
  filepath: string,
  folder: string
) {
  const s3 = new AWS.S3({
    accessKeyId: process.env.ACCESS_KEY_ID,
    secretAccessKey: process.env.SECRET_ACCESS_KEY,
  });
  const bucketName = process.env.BUCKET_NAME!;

  const params = {
    Bucket: bucketName,
    Key: `${folder}/${filepath}`,
    Body: fileContent,
  };
  const data = await s3.upload(params).promise();
  return data.Location;
}
