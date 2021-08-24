import fs, { createReadStream } from 'fs';
import { join as pathJoin } from 'path';
import crypto from 'crypto';
import Arweave from 'arweave';
import mime from 'mime';
import clui from 'clui';
import Transaction from 'arweave/node/lib/transaction';
import { JWKInterface } from 'arweave/node/lib/wallet';
import clc from 'cli-color';
import Ardb from 'ardb';
import { GQLEdgeTransactionInterface } from 'ardb/lib/faces/gql';
import IPFS from './ipfs';
import Community from 'community-js';
import pRetry from 'p-retry';
import PromisePool from '@supercharge/promise-pool';
import { pipeline } from 'stream/promises';
import { createTransactionAsync, uploadTransactionAsync } from 'arweave-stream-tx';
import ArdbTransaction from 'ardb/lib/models/transaction';

export default class Deploy {
  private wallet: JWKInterface;
  private arweave: Arweave;
  private ardb: Ardb;
  private ipfs: IPFS = new IPFS();
  private txs: { path: string; hash: string; tx: Transaction; type: string }[];

  private debug: boolean = false;
  private logs: boolean = true;

  private community: Community;

  constructor(wallet: JWKInterface, arweave: Arweave, debug: boolean = false, logs: boolean = true) {
    this.wallet = wallet;
    this.arweave = arweave;
    this.debug = debug;
    this.logs = logs;

    // @ts-ignore
    this.ardb = new Ardb(arweave, debug ? 1 : 2);
    this.community = new Community(arweave, wallet);
  }

  async prepare(
    dir: string,
    files: string[],
    index: string = 'index.html',
    tags: { name: string; value: string }[] = [],
    toIpfs: boolean = false,
  ) {
    this.txs = [];

    let leftToPrepare = files.length;
    let countdown: clui.Spinner;
    if (this.logs) {
      countdown = new clui.Spinner(`Preparing ${leftToPrepare} files...`, ['⣾', '⣽', '⣻', '⢿', '⡿', '⣟', '⣯', '⣷']);
      countdown.start();
    }

    const go = async (f: string) => {
      return new Promise((resolve, reject) => {
        fs.readFile(f, async (err, data) => {
          if (err) {
            console.log('Unable to read file ' + f);
            throw new Error(`Unable to read file: ${f}`);
          }

          if (!data || !data.length) {
            resolve(true);
          }

          const hash = await this.toHash(data);
          const type = mime.getType(f) || 'application/octet-stream';
          const tx = await this.buildTransaction(f, hash, data, type, toIpfs, tags);
          this.txs.push({ path: f, hash, tx, type });

          if (this.logs) countdown.message(`Preparing ${--leftToPrepare} files...`);

          resolve(true);
        });
      });
    };

    const retry = async (f: string) => {
      await pRetry(async () => go(f), {
        onFailedAttempt: async (error) => {
          console.log(
            clc.blackBright(
              `Attempt ${error.attemptNumber} failed, ${error.retriesLeft} left. Error: ${error.message}`,
            ),
          );
          await this.sleep(300);
        },
        retries: 5,
      });
    };

    await PromisePool.withConcurrency(10)
      .for(files)
      .process(async (file) => {
        await retry(file);
        return true;
      });

    // Query to find all the files previously deployed
    const hashes = this.txs.map((t) => t.hash);
    const txs: ArdbTransaction[] = await this.queryGQLPaths(hashes);

    const isFile = this.txs.length === 1 && this.txs[0].path === dir;
    if (isFile) {
      if (txs.find((tx) => this.hasMatchingTag(tags, tx))) {
        if (this.logs) countdown.stop();

        console.log(clc.red('File already deployed:'));

        if (toIpfs && files.length === 1) {
          const data = fs.readFileSync(files[0]);
          const cid = await this.ipfs.hash(data);
          console.log(`IPFS: ${clc.cyan(cid)}`);
        }

        console.log(
          'Arweave: ' +
          clc.cyan(`${this.arweave.api.getConfig().protocol}://${this.arweave.api.getConfig().host}/${txs[0].id}`),
        );
        process.exit(0);
      }
    } else {
      await this.buildManifest(dir, index, tags, txs);
    }

    if (this.logs) countdown.stop();
    return this.txs;
  }

  async deploy(isFile: boolean = false): Promise<string> {
    let cTotal = this.txs.length;

    let countdown: clui.Spinner;
    if (this.logs) {
      countdown = new clui.Spinner(`Deploying ${cTotal} files...`, ['⣾', '⣽', '⣻', '⢿', '⡿', '⣟', '⣯', '⣷']);
      countdown.start();
    }

    let txid = this.txs[0].tx.id;
    if (!isFile) {
      for (let i = 0, j = this.txs.length; i < j; i++) {
        if (this.txs[i].path === '' && this.txs[i].hash === '') {
          txid = this.txs[i].tx.id;
          break;
        }
      }
    }

    let target = '';
    try {
      await this.community.setCommunityTx('mzvUgNc8YFk0w5K5H7c8pyT-FC5Y_ba0r7_8766Kx74');
      target = await this.community.selectWeightedHolder();
    } catch {
      console.log(clc.red('Unable to set community transaction'));
    }

    if ((await this.arweave.wallets.jwkToAddress(this.wallet)) !== target) {
      const fee: number = this.txs.reduce((a, txData) => a + +txData.tx.reward, 0);
      const quantity = parseInt((fee * 0.1).toString(), 10).toString();

      if (target.length) {
        const tx = await this.arweave.createTransaction({
          target,
          quantity,
        });

        tx.addTag('Action', 'Deploy');
        tx.addTag('Message', `Deployed ${cTotal} ${isFile ? 'file' : 'files'} on https://arweave.net/${txid}`);
        tx.addTag('Service', 'arkb');
        tx.addTag('App-Name', 'arkb');
        tx.addTag('App-Version', process.env.npm_package_version);

        await this.arweave.transactions.sign(tx, this.wallet);
        await this.arweave.transactions.post(tx);
      }
    }

    const go = async (txData: { path: string; hash: string; tx: Transaction; type: string }) => {
      if (txData.path === '' && txData.hash === '') {
        const uploader = await this.arweave.transactions.getUploader(txData.tx);
        while (!uploader.isComplete) {
          await uploader.uploadChunk();
        }
      } else {
        await pipeline(createReadStream(txData.path), uploadTransactionAsync(txData.tx, this.arweave));
      }
      if (this.logs) countdown.message(`Deploying ${--cTotal} files...`);
      return true;
    };

    const retry = async (txData: { path: string; hash: string; tx: Transaction; type: string }) => {
      await pRetry(() => go(txData), {
        onFailedAttempt: async (error) => {
          console.log(
            clc.blackBright(
              `Attempt ${error.attemptNumber} failed, ${error.retriesLeft} left. Error: ${error.message}`,
            ),
          );
          await this.sleep(300);
        },
        retries: 5,
      });
    };

    await PromisePool.withConcurrency(5)
      .for(this.txs)
      .process(async (txData) => {
        await retry(txData);
        return true;
      });
    if (this.logs) countdown.stop();

    return txid;
  }

  private async buildTransaction(
    filePath: string,
    hash: string,
    data: Buffer,
    type: string,
    toIpfs: boolean = false,
    tags: { name: string; value: string }[] = [],
  ): Promise<Transaction> {
    const tx = await pipeline(createReadStream(pathJoin(__dirname, filePath)), createTransactionAsync({}, this.arweave, this.wallet));

    for (const tag of tags) {
      tx.addTag(tag.name, tag.value);
    }

    if (toIpfs) {
      const ipfsHash = await this.ipfs.hash(data);
      tx.addTag('IPFS-Add', ipfsHash);
    }

    tx.addTag('User-Agent', `arkb`);
    tx.addTag('User-Agent-Version', process.env.npm_package_version);
    tx.addTag('Type', 'file');
    tx.addTag('Content-Type', type);
    tx.addTag('File-Hash', hash);

    await this.arweave.transactions.sign(tx, this.wallet);
    return tx;
  }

  private async buildManifest(
    dir: string,
    index: string = null,
    customTags: { name: string; value: string }[],
    txs: ArdbTransaction[],
  ) {
    const paths: { [key: string]: { id: string } } = {};

    this.txs = this.txs.filter((t) => {
      const remoteTx = txs.find(
        // tslint:disable-next-line: no-shadowed-variable
        (tx) => tx.tags.find((txTag) => txTag.value === t.hash) && this.hasMatchingTag(customTags, tx),
      );
      if (!remoteTx) {
        return true;
      }
      const path = `${t.path.split(`${dir}/`)[1]}`;
      paths[path] = { id: remoteTx.id };
      return false;
    });

    for (let i = 0, j = this.txs.length; i < j; i++) {
      const t = this.txs[i];
      const path = `${t.path.split(`${dir}/`)[1]}`;
      t.path = path;
      paths[path] = { id: t.tx.id };
    }

    if (!index) {
      if (Object.keys(paths).includes('index.html')) {
        index = 'index.html';
      } else {
        index = Object.keys(paths)[0];
      }
    } else {
      if (!Object.keys(paths).includes(index)) {
        index = Object.keys(paths)[0];
      }
    }

    const data = {
      manifest: 'arweave/paths',
      version: '0.1.0',
      index: {
        path: index,
      },
      paths,
    };

    const tx = await this.arweave.createTransaction({ data: JSON.stringify(data) }, this.wallet);

    if (customTags && customTags.length) {
      for (const tag of customTags) {
        tx.addTag(tag.name, tag.value);
      }
    }

    tx.addTag('User-Agent', `arkb`);
    tx.addTag('User-Agent-Version', process.env.npm_package_version);
    tx.addTag('Type', 'manifest');
    tx.addTag('Content-Type', 'application/x.arweave-manifest+json');

    await this.arweave.transactions.sign(tx, this.wallet);
    this.txs.push({ path: '', hash: '', tx, type: 'application/x.arweave-manifest+json' });

    return true;
  }

  private async toHash(data: Buffer): Promise<string> {
    const hash = crypto.createHash('sha256');
    hash.update(data);
    return hash.digest('hex');
  }

  private async queryGQLPaths(hashes: string[]): Promise<ArdbTransaction[]> {
    let txs: ArdbTransaction[] = [];
    let chunk: string[];
    const ownerKey = await this.arweave.wallets.jwkToAddress(this.wallet);

    try {
      while (hashes.length) {
        chunk = hashes.splice(0, 500);
        txs = (await this.ardb
          .search('transactions')
          .from(ownerKey)
          .tags([
            { name: 'User-Agent', values: ['arkb'] },
            { name: 'File-Hash', values: chunk },
            { name: 'Type', values: ['file'] },
          ])
          .only(['id', 'tags', 'tags.name', 'tags.value'])
          .findAll()) as ArdbTransaction[];
      }
    } catch (e) {
      console.log(clc.red(`Unable to query ${this.arweave.getConfig().api.host}`));
      if (this.debug) console.log(e);
      return [];
    }

    return txs;
  }

  private hasMatchingTag(customTags: { name: string; value: string }[], tx: ArdbTransaction): boolean {
    return !customTags.find(
      (customTag) => !tx.tags.find((txTag) => txTag.name === customTag.name && txTag.value === customTag.value),
    );
  }

  private sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
