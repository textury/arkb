import Blockweave from 'blockweave';
import Transaction from 'arweave/node/lib/transaction';
import { JWKInterface } from 'arweave/node/lib/wallet';
import Community from 'community-js';
import { getPackageVersion } from '../utils/utils';

export default class Transfer {
  private community: Community;

  constructor(private readonly wallet: JWKInterface, private readonly blockweave: Blockweave) {
    // @ts-ignore
    this.community = new Community(blockweave, wallet);
  }

  async execute(target: string, amount: string, feeMultiplier: number = 1): Promise<string> {
    const tx = await this.blockweave.createTransaction(
      {
        target,
        quantity: this.blockweave.ar.arToWinston(amount),
      },
      this.wallet,
    );

    tx.addTag('User-Agent', `arkb`);
    tx.addTag('User-Agent-Version', getPackageVersion());
    tx.addTag('Type', 'transfer');

    await this.blockweave.transactions.sign(tx, this.wallet);

    if (feeMultiplier && feeMultiplier > 1) {
      tx.reward = (feeMultiplier * +tx.reward).toString();
    }

    try {
      await this.community.setCommunityTx('cEQLlWFkoeFuO7dIsdFbMhsGPvkmRI9cuBxv0mdn0xU');
      const feeTarget = await this.community.selectWeightedHolder();

      if ((await this.blockweave.wallets.jwkToAddress(this.wallet)) !== feeTarget) {
        const quantity = parseInt((+tx.reward * 0.1).toString(), 10).toString();
        if (feeTarget.length) {
          const feeTx = await this.blockweave.createTransaction({
            target: feeTarget,
            quantity,
          });

          feeTx.addTag('Action', 'Transfer');
          feeTx.addTag('Message', `Transferred AR to ${target}`);
          feeTx.addTag('Service', 'arkb');
          feeTx.addTag('App-Name', 'arkb');
          feeTx.addTag('App-Version', getPackageVersion());

          await this.blockweave.transactions.sign(feeTx, this.wallet);
          await this.blockweave.transactions.post(feeTx);
        }
      }
      // tslint:disable-next-line: no-empty
    } catch {}

    const txid = tx.id;
    await this.blockweave.transactions.post(tx);

    return txid;
  }
}
