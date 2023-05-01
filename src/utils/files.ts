import * as fs from 'fs';
import path from 'path';
import { Context } from '@/types';

type FileType = 'document' | 'photo';

export const getFileId = (ctx: Context, type: FileType): string => {
  if (type === 'document') {
    const document = ctx.message?.document;

    if (document) {
      return document.file_id;
    }
  }

  const photos = ctx.update.message?.photo;

  if (photos) {
    console.log(photos);
    return photos[0].file_id;
  }

  return '';
};

export const downloadFile = async (
  ctx: Context,
  type: FileType,
  filename: string
): Promise<string> => {
  const fileId = getFileId(ctx, type);
  const file = await ctx.api.getFile(fileId);

  if (typeof file.download !== 'function') {
    throw new Error('This file is already loaded.');
  }

  const pathname = await file.download();

  if (pathname) {
    fs.copyFileSync(
      pathname,
      path.resolve(`${__dirname}/../assets/${filename}`)
    );
  }

  return pathname;
};
