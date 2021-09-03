import { DataItem } from 'ans104';
import Transaction from 'arweave/node/lib/transaction';

export interface TxDetail {
  filePath: string;
  hash: string;
  tx: Transaction | DataItem;
  type: string;
}
