import fs from 'fs';
import { ArweaveSigner } from 'arbundles';
import { createData, bundleAndSignData, FileDataItem } from 'arbundles/file';
import Blockweave from 'blockweave';
import { AxiosResponse } from 'axios';
import { JWKInterface } from 'blockweave/dist/faces/lib/wallet';

export default class Bundler {
  private signer: ArweaveSigner;
  private blockweave: Blockweave;

  constructor(wallet: JWKInterface, blockweave: Blockweave) {
    this.signer = new ArweaveSigner(wallet);
    this.blockweave = blockweave;
  }

  async createItem(data: Buffer | string, tags: { name: string; value: string }[] = []): Promise<FileDataItem> {
    const item = await createData(data, this.signer, {
      tags,
    });

    await item.sign(this.signer);
    return item;
  }

  async bundleAndSign(txs: FileDataItem[]) {
    return bundleAndSignData(txs, this.signer);
  }

  async post(tx: FileDataItem, bundler: string): Promise<AxiosResponse<any>> {
    return tx.sendToBundler(bundler);
  }
}
