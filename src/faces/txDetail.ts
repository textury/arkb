import Transaction from "arweave/node/lib/transaction";

export interface TxDetail {
  filePath: string;
  hash: string;
  tx: Transaction;
  type: string
}