import { FileDataItem } from 'arbundles/file';
import Transaction from 'blockweave/dist/lib/transaction';

export interface TxDetail {
  filePath: string;
  hash: string;
  tx: Transaction | FileDataItem;
  type: string;
  fileSize?: number;
}
