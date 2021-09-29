import Blockweave from 'blockweave';
import { CreateTransactionInterface } from 'blockweave/dist/faces/blockweave';
import { TransactionInterface } from 'blockweave/dist/faces/lib/transaction';
import { JWKInterface } from 'blockweave/dist/faces/lib/wallet';
import Transaction from 'blockweave/dist/lib/transaction';
import { bufferTob64Url } from 'blockweave/dist/utils/buffer';
import { pipeline } from 'stream/promises';
import { generateTransactionChunksAsync } from './generateTransactionChunkAsync';

export function createTransactionAsync(
  attributes: Partial<Omit<CreateTransactionInterface, 'data'>>,
  blockweave: Blockweave,
  jwk: JWKInterface | null | undefined,
) {
  return async (source: AsyncIterable<Buffer>): Promise<Transaction> => {
    const chunks = await pipeline(source, generateTransactionChunksAsync());

    const txAttrs = Object.assign({}, attributes);

    txAttrs.owner ??= jwk?.n;
    txAttrs.last_tx ??= await blockweave.transactions.getTransactionAnchor();

    const lastChunk = chunks.chunks[chunks.chunks.length - 1];
    const dataByteLength = lastChunk.maxByteRange;

    txAttrs.reward ??= await blockweave.transactions.getPrice(dataByteLength, txAttrs.target);

    txAttrs.data_size = dataByteLength.toString();

    const tx = new Transaction(txAttrs as TransactionInterface, blockweave, jwk);

    tx.chunks = chunks;
    tx.data_root = bufferTob64Url(chunks.data_root);

    return tx;
  };
}
