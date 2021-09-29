import chunker from 'stream-chunker';
import Transaction from 'blockweave/dist/lib/transaction';
import { pipeline } from 'stream/promises';
import Blockweave from 'blockweave';
import { Chunk } from 'blockweave/dist/faces/utils/merkle';
import Merkle, { MAX_CHUNK_SIZE, MIN_CHUNK_SIZE } from 'blockweave/dist/utils/merkle';

const merkle = new Merkle();

/**
 * Generates the Arweave transaction chunk information from the piped data stream.
 */
export function generateTransactionChunksAsync() {
  return async (source: AsyncIterable<Buffer>): Promise<NonNullable<Transaction['chunks']>> => {
    const chunks: Chunk[] = [];

    /**
     * @param chunkByteIndex the index the start of the specified chunk is located at within its original data stream.
     */
    async function addChunk(chunkByteIndex: number, chunk: Buffer): Promise<Chunk> {
      const dataHash = await Blockweave.crypto.hash(chunk);

      const chunkRep = {
        dataHash,
        minByteRange: chunkByteIndex,
        maxByteRange: chunkByteIndex + chunk.byteLength,
      };

      chunks.push(chunkRep);

      return chunkRep;
    }

    let chunkStreamByteIndex = 0;
    let previousDataChunk: Buffer | undefined;
    let expectChunkGenerationCompleted = false;

    await pipeline(source, chunker(MAX_CHUNK_SIZE, { flush: true }), async (chunkedSource: AsyncIterable<Buffer>) => {
      for await (const chunk of chunkedSource) {
        if (expectChunkGenerationCompleted) {
          throw Error('Expected chunk generation to have completed.');
        }

        if (chunk.byteLength >= MIN_CHUNK_SIZE && chunk.byteLength <= MAX_CHUNK_SIZE) {
          await addChunk(chunkStreamByteIndex, chunk);
        } else if (chunk.byteLength < MIN_CHUNK_SIZE) {
          if (previousDataChunk) {
            // If this final chunk is smaller than the minimum chunk size, rebalance this final chunk and
            // the previous chunk to keep the final chunk size above the minimum threshold.
            const remainingBytes = Buffer.concat(
              [previousDataChunk, chunk],
              previousDataChunk.byteLength + chunk.byteLength,
            );
            const rebalancedSizeForPreviousChunk = Math.ceil(remainingBytes.byteLength / 2);

            const previousChunk = chunks.pop()!;
            const rebalancedPreviousChunk = await addChunk(
              previousChunk.minByteRange,
              remainingBytes.slice(0, rebalancedSizeForPreviousChunk),
            );

            await addChunk(rebalancedPreviousChunk.maxByteRange, remainingBytes.slice(rebalancedSizeForPreviousChunk));
          } else {
            // This entire stream should be smaller than the minimum chunk size, just add the chunk in.
            await addChunk(chunkStreamByteIndex, chunk);
          }

          expectChunkGenerationCompleted = true;
        } else if (chunk.byteLength > MAX_CHUNK_SIZE) {
          throw Error('Encountered chunk larger than max chunk size.');
        }

        chunkStreamByteIndex += chunk.byteLength;
        previousDataChunk = chunk;
      }
    });

    const leaves = await merkle.generateLeaves(chunks);
    const root = await merkle.buildLayers(leaves);
    const proofs = merkle.generateProofs(root);

    return {
      data_root: root.id,
      chunks,
      proofs,
    };
  };
}
