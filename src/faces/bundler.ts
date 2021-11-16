export interface BundlerWithdraw {
  publicKey: string;
  currency: 'arweave';
  amount: number;
  nonce: number;
  signature: unknown;
}
