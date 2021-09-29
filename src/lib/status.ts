import Blockweave from 'blockweave';

export async function status(
  txid: string,
  blockweave: Blockweave,
): Promise<{ status: number; blockHeight: number; blockHash: string; confirmations: number; errorMessage?: string }> {
  const res = await blockweave.api.get(txid);
  if (res.status !== 200 && res.status !== 202) {
    return { status: res.status, blockHeight: -1, blockHash: '', confirmations: -1, errorMessage: res.data };
  }

  const { data } = await blockweave.api.get(`tx/${txid}/status`);
  return {
    blockHeight: data.block_height,
    blockHash: data.block_indep_hash,
    confirmations: data.number_of_confirmations,
    status: res.status,
  };
}
