import { ArweaveSigner } from 'arbundles';
import { createData, bundleAndSignData, DataItem } from 'arbundles';
import { JWKInterface } from 'arweave/node/lib/wallet';

export default class Bundler {
  private signer: ArweaveSigner;

  constructor(wallet: JWKInterface) {
    this.signer = new ArweaveSigner(wallet);
  }

  async createItem(data: Buffer | string, tags: { name: string; value: string }[] = []): Promise<DataItem> {
    const item = await createData(
      data,
      this.signer,
      {
        tags,
      },
    );

    await item.sign(this.signer);
    return item;
  }

  async bundleAndSign(txs: DataItem[]) {
    return bundleAndSignData(txs, this.signer);
  }
}
