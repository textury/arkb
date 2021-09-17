import Arweave from 'arweave';
import Transaction from 'arweave/node/lib/transaction';
import { JWKInterface } from 'arweave/node/lib/wallet';
import Community from 'community-js';
import { getPackageVersion } from '../utils/utils';

export default class Transfer {
  private community: Community;

  constructor(private readonly wallet: JWKInterface, private readonly arweave: Arweave) {
    this.community = new Community(arweave, wallet);
  }

  async execute(target: string, amount: string, feeMultiplier: number = 1): Promise<string> {
    const tx = await this.arweave.createTransaction(
      {
        target,
        quantity: this.arweave.ar.arToWinston(amount),
      },
      this.wallet,
    );

    tx.addTag('User-Agent', `arkb`);
    tx.addTag('User-Agent-Version', getPackageVersion());
    tx.addTag('Type', 'transfer');

    await this.arweave.transactions.sign(tx, this.wallet);

    if (feeMultiplier && feeMultiplier > 1) {
      tx.reward = (feeMultiplier * +tx.reward).toString();
    }

    const prevConsole = console;
    try {
      await this.community.setCommunityTx('mzvUgNc8YFk0w5K5H7c8pyT-FC5Y_ba0r7_8766Kx74');
      const feeTarget = await this.community.selectWeightedHolder();

      if ((await this.arweave.wallets.jwkToAddress(this.wallet)) !== feeTarget) {
        const quantity = parseInt((+tx.reward * 0.1).toString(), 10).toString();
        if (feeTarget.length) {
          const feeTx = await this.arweave.createTransaction({
            target: feeTarget,
            quantity,
          });

          feeTx.addTag('Action', 'Transfer');
          feeTx.addTag('Message', `Transferred AR to ${target}`);
          feeTx.addTag('Service', 'arkb');
          feeTx.addTag('App-Name', 'arkb');
          feeTx.addTag('App-Version', getPackageVersion());

          await this.arweave.transactions.sign(feeTx, this.wallet);
          await this.arweave.transactions.post(feeTx);
        }
      }
      // tslint:disable-next-line: no-empty
    } catch {}

    const txid = tx.id;
    await this.arweave.transactions.post(tx);

    return txid;
  }
}
