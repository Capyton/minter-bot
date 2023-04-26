import { Context } from '@/types';

type FileType = 'document' | 'photo';

export const getFileId = (ctx: Context, type: FileType): string => {
  if (type === 'document') {
    const document = ctx.message?.document;

    if (document) {
      return document.file_id;
    }
  }

  const photos = ctx.message?.photo;

  if (photos) {
    return photos[0].file_id;
  }

  return '';
};

export const downloadFile = async (
  ctx: Context,
  type: FileType
): Promise<string> => {
  const fileId = getFileId(ctx, type);
  const file = await ctx.api.getFile(fileId);

  if (typeof file.download === 'function') {
    const pathname = await file.download();

    return pathname;
  }

  // @ts-ignore
  const pathname = JSON.stringify(file.download['r']['result']);

  return pathname;
};
