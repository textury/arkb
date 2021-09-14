import { FileDataItem } from 'ans104/file';
import Transaction from 'arweave/node/lib/transaction';

export interface TxDetail {
  filePath: string;
  hash: string;
  tx: Transaction | FileDataItem;
  type: string;
}
