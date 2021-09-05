import { ArweaveSigner } from 'ans104';
import { createData, bundleAndSignData, FileDataItem } from 'ans104/file';
import { JWKInterface } from 'arweave/node/lib/wallet';
import IPFS from './ipfs';

export default class Bundler {
  private ipfs: IPFS = new IPFS();
  private signer: ArweaveSigner;

  constructor(wallet: JWKInterface, private readonly packageVersion: string) {
    this.signer = new ArweaveSigner(wallet);
  }

  async createItem(
    data: Buffer | string,
    tags: { name: string; value: string }[] = [],
  ): Promise<FileDataItem> {
    const item = await createData(
      {
        data,
        tags,
      },
      this.signer,
    );

    await item.sign(this.signer);
    return item;
  }

  async bundleAndSign(txs: FileDataItem[]) {
    return bundleAndSignData(txs, this.signer);
  }
}
