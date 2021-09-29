import fs from 'fs';
import { ArweaveSigner } from 'ans104';
import { createData, bundleAndSignData, FileDataItem } from 'ans104/file';
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

  async post(tx: FileDataItem, bundler: string): Promise<AxiosResponse<any>> {
    return this.blockweave.api.request().post(`${bundler}/tx`, fs.createReadStream(tx.filename), {
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
