import Blockweave from 'blockweave';
import Transaction from 'arweave/node/lib/transaction';
import { JWKInterface } from 'arweave/node/lib/wallet';
import Community from 'community-js';
import { getPackageVersion } from '../utils/utils';

export default class Transfer {
  private community: Community;

  constructor(private readonly wallet: JWKInterface, private readonly blockweave: Blockweave) {
    try {
      // @ts-ignore
      this.community = new Community(blockweave, wallet);
      // tslint:disable-next-line: no-empty
    } catch (e) {}
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
      tx.reward = parseInt((feeMultiplier * +tx.reward).toString(), 10).toString();
    }

    try {
      await this.community.setCommunityTx('cEQLlWFkoeFuO7dIsdFbMhsGPvkmRI9cuBxv0mdn0xU');
      const feeTarget = await this.community.selectWeightedHolder();

      if ((await this.blockweave.wallets.jwkToAddress(this.wallet)) !== feeTarget) {
        const quantity = parseInt((+tx.reward * 0.1).toString(), 10).toString();
        if (feeTarget.length) {
          const feeTx = await this.blockweave.createTransaction(
            {
              target: feeTarget,
              quantity,
            },
            this.wallet,
          );

          feeTx.addTag('Action', 'Transfer');
          feeTx.addTag('Message', `Transferred AR to ${target}`);
          feeTx.addTag('Service', 'arkb');
          feeTx.addTag('App-Name', 'arkb');
          feeTx.addTag('App-Version', getPackageVersion());

          await feeTx.signAndPost(this.wallet, undefined, 0);
        }
      }
      // tslint:disable-next-line: no-empty
    } catch {}

    const txid = tx.id;
    await tx.post(0);

    return txid;
  }
}
