import { InputFile } from 'grammy';
import { Address } from 'ton-core';
import { Context, Conversation } from '@/types';
import { getFileId, getFileUrl } from '@/utils/files';

export type customMetadataType = {
  common_values: any;
  specific_values: any;
};

export const getCustomMetadata = async (
  conversation: Conversation,
  ctx: Context
): Promise<customMetadataType> => {
  await ctx.replyWithDocument(new InputFile('./src/assets/example.json'), {
    caption:
      'Send the json file with the custom metadata: (see an example of correct json above)',
  });
  const metadataCtx = await conversation.waitFor(':file');

  const fileId = getFileId(metadataCtx, 'document');
  const file = await ctx.api.getFile(fileId);

  let fileUrl;
  if (file.file_path) {
    fileUrl = getFileUrl(file.file_path);
  } else {
    throw new Error('File path does not exist');
  }

  let customMetadataJson: customMetadataType;

  try {
    customMetadataJson = await (await fetch(fileUrl)).json();
  } catch (SyntaxError) {
    await ctx.reply('Be sure, that you sending me correct JSON file!');
    return await getCustomMetadata(conversation, ctx);
  }

  if (
    !('common_values' in customMetadataJson) &&
    !('specific_values' in customMetadataJson)
  ) {
    await ctx.reply(
      "I did't find 'common_values' or 'specific_values' keys in your json. Be sure that u sending me correct file and try again!"
    );
    return await getCustomMetadata(conversation, ctx);
  }

  return parseCustomMetadata(customMetadataJson);
};

function parseCustomMetadata(
  customMetadataJson: customMetadataType
): customMetadataType {
  if (typeof customMetadataJson.specific_values === 'undefined') {
    return customMetadataJson;
  }
  const keys = Object.keys(customMetadataJson.specific_values);

  keys.forEach((key) => {
    if (typeof key !== 'string') {
      return;
    }

    customMetadataJson.specific_values[Address.parse(key).toRawString()] =
      customMetadataJson.specific_values[key];
    delete customMetadataJson.specific_values[key];
  });
  console.log(customMetadataJson, ' custom metadata json parsed');
  return customMetadataJson;
}
