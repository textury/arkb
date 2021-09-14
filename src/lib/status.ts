import Arweave from 'arweave';

export async function status(
  txid: string,
  arweave: Arweave,
): Promise<{ status: number; blockHeight: number; blockHash: string; confirmations: number; errorMessage?: string }> {
  return new Promise(async (resolve, reject) => {
    try {
      const res = await arweave.api.get(txid);
      if (res.status !== 200 && res.status !== 202) {
        resolve({ status: res.status, blockHeight: -1, blockHash: '', confirmations: -1, errorMessage: res.data });
      }

      const { data } = await arweave.api.get(`tx/${txid}/status`);
      resolve({
        blockHeight: data.block_height,
        blockHash: data.block_indep_hash,
        confirmations: data.number_of_confirmations,
        status: res.status,
      });
    } catch (e) {
      reject(e);
    }
  });
}
