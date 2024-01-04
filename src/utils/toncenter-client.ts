import { TonClient } from 'ton';
import * as dotenv from 'dotenv';

dotenv.config();

const toncenterBaseEndpoint: string = process.env.TESTNET!
  ? 'https://testnet.toncenter.com'
  : 'https://toncenter.com';

export const tonClient = new TonClient({
  endpoint: `${toncenterBaseEndpoint}/api/v2/jsonRPC`,
  apiKey: process.env.TONCENTER_API_KEY,
});
