import fs from 'fs';
import { ArweaveSigner } from 'ans104';
import { createData, bundleAndSignData, FileDataItem } from 'ans104/file';
import { JWKInterface } from 'arweave/node/lib/wallet';
import Arweave from 'arweave';
import { AxiosResponse } from 'axios';

export default class Bundler {
  private signer: ArweaveSigner;
  private arweave: Arweave;

  constructor(wallet: JWKInterface, arweave: Arweave) {
    this.signer = new ArweaveSigner(wallet);
    this.arweave = arweave;
  }

  async createItem(data: Buffer | string, tags: { name: string; value: string }[] = []): Promise<FileDataItem> {
    const item = await createData({
      data,
      tags
    }, this.signer);

    await item.sign(this.signer);
    return item;
  }

  async bundleAndSign(txs: FileDataItem[]) {
    return bundleAndSignData(txs, this.signer);
  }

  async post(tx: FileDataItem, bundler: string): Promise<AxiosResponse<any>> {
    return this.arweave.api.request().post(`${bundler}/tx`, fs.createReadStream(tx.filename), {
      headers: {
        'content-type': 'application/octet-stream',
      },
      maxRedirects: 1,
      timeout: 10000,
      maxBodyLength: Infinity,
      validateStatus: (status) => ![500, 400].includes(status),
    });
  }
}
