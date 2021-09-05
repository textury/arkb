import { ArweaveSigner, bundleAndSignData, createData, DataItem } from 'ans104';
import { JWKInterface } from 'arweave/node/lib/wallet';
import IPFS from './ipfs';

export default class Bundler {
  private ipfs: IPFS = new IPFS();
  private signer: ArweaveSigner;

  constructor(wallet: JWKInterface, private readonly packageVersion: string) {
    this.signer = new ArweaveSigner(wallet);
  }

  async createItem(
    hash: string,
    data: Buffer,
    type: string,
    toIpfs: boolean = false,
    tags: { name: string; value: string }[] = [],
  ): Promise<DataItem> {
    if (toIpfs) {
      const ipfsHash = await this.ipfs.hash(data);
      tags.push({ name: 'IPFS-Add', value: ipfsHash });
    }

    tags.push({ name: 'User-Agent', value: `arkb` });
    tags.push({ name: 'User-Agent-Version', value: this.packageVersion });
    tags.push({ name: 'Type', value: 'file' });
    if (type) tags.push({ name: 'Content-Type', value: type });
    tags.push({ name: 'File-Hash', value: hash });
    tags.push({ name: 'Bundler', value: 'ans104' });

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

  async bundleAndSign(txs: DataItem[]) {
    return bundleAndSignData(txs, this.signer);
  }
}
