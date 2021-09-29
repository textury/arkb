import fs, { createReadStream } from 'fs';
import path from 'path';
import crypto from 'crypto';
import Blockweave from 'blockweave';
import mime from 'mime';
import clui from 'clui';
import clc from 'cli-color';
import IPFS from '../utils/ipfs';
import Community from 'community-js';
import pRetry from 'p-retry';
import PromisePool from '@supercharge/promise-pool';
import { pipeline } from 'stream/promises';
import { TxDetail } from '../faces/txDetail';
import { FileDataItem } from 'ans104/file';
import Bundler from '../utils/bundler';
import Tags from '../lib/tags';
import { getPackageVersion, pause } from '../utils/utils';
import { createTransactionAsync } from '../utils/createTransactionAsync';
import { JWKInterface } from 'blockweave/dist/faces/lib/wallet';
import Transaction from 'blockweave/dist/lib/transaction';
import { uploadTransactionAsync } from '../utils/uploadTransactionAsync';
import Cache from '../utils/cache';

export default class Deploy {
  private wallet: JWKInterface;
  private blockweave: Blockweave;
  private bundler: Bundler;
  private ipfs: IPFS = new IPFS();
  private cache: Cache;
  private txs: TxDetail[];

  private debug: boolean = false;
  private logs: boolean = true;

  private community: Community;

  constructor(wallet: JWKInterface, blockweave: Blockweave, debug: boolean = false, logs: boolean = true) {
    this.wallet = wallet;
    this.blockweave = blockweave;
    this.debug = debug;
    this.logs = logs;

    this.cache = new Cache(debug);

    this.bundler = new Bundler(wallet, this.blockweave);

    try {
      // @ts-ignore
      this.community = new Community(blockweave, wallet);

      // tslint:disable-next-line: no-empty
    } catch {}
  }

  getBundler(): Bundler {
    return this.bundler;
  }

  async prepare(
    dir: string,
    files: string[],
    index: string = 'index.html',
    tags: Tags = new Tags(),
    toIpfs: boolean = false,
    useBundler?: string,
    feeMultiplier?: number,
    forceRedeploy: boolean = false,
  ) {
    this.txs = [];

    if (useBundler) {
      tags.addTag('Bundler', useBundler);
      tags.addTag('Bundle', 'arbundles');
    }

    let leftToPrepare = files.length;
    let countdown: clui.Spinner;
    if (this.logs) {
      countdown = new clui.Spinner(`Preparing ${leftToPrepare} files...`, ['⣾', '⣽', '⣻', '⢿', '⡿', '⣟', '⣯', '⣷']);
      countdown.start();
    }

    for (const filePath of files) {
      let data: Buffer;
      try {
        data = fs.readFileSync(filePath);
      } catch (e) {
        console.log('Unable to read file ' + filePath);
        throw new Error(`Unable to read file: ${filePath}`);
      }

      if (!data || !data.length) {
        continue;
      }

      const hash = await this.toHash(data);
      const type = mime.getType(filePath) || 'application/octet-stream';

      // Add/replace default tags
      if (toIpfs) {
        const ipfsHash = await this.ipfs.hash(data);
        tags.addTag('IPFS-Add', ipfsHash);
      }
      tags.addTag('User-Agent', `arkb`);
      tags.addTag('User-Agent-Version', getPackageVersion());
      tags.addTag('Type', 'file');
      if (type) tags.addTag('Content-Type', type);
      tags.addTag('File-Hash', hash);

      let tx: Transaction | FileDataItem;
      if (useBundler) {
        tx = await this.bundler.createItem(data, tags.tags);
      } else {
        tx = await this.buildTransaction(filePath, tags);
        if (feeMultiplier && feeMultiplier > 1) {
          (tx as Transaction).reward = (feeMultiplier * +(tx as Transaction).reward).toString();
        }
      }
      this.txs.push({ filePath, hash, tx, type });

      if (this.logs) countdown.message(`Preparing ${--leftToPrepare} files...`);
    }

    if (this.logs) countdown.stop();

    // Query to find all the files previously deployed
    if (this.logs) countdown = new clui.Spinner('Removing duplicates...', ['⣾', '⣽', '⣻', '⢿', '⡿', '⣟', '⣯', '⣷']);
    const txs: TxDetail[] = await this.queryGQLPaths(this.txs, forceRedeploy);
    if (this.logs) countdown.stop();

    const isFile = this.txs.length === 1 && this.txs[0].filePath === dir;
    if (isFile && txs.length) {
      console.log(clc.red('File already deployed:'));

      if (toIpfs) {
        const data = fs.readFileSync(files[0]);
        const cid = await this.ipfs.hash(data);
        console.log(`IPFS: ${clc.cyan(cid)}`);
      }

      console.log('Arweave: ' + clc.cyan(`${this.blockweave.config.url}/${txs[0].tx.id}`));
      return;
    } else {
      if (this.logs) {
        countdown = new clui.Spinner(`Building manifest...`, ['⣾', '⣽', '⣻', '⢿', '⡿', '⣟', '⣯', '⣷']);
        countdown.start();
      }

      await this.buildManifest(dir, index, tags, txs, useBundler, feeMultiplier, forceRedeploy);
      if (this.logs) countdown.stop();
    }

    return this.txs;
  }

  async deploy(isFile: boolean = false, useBundler?: string): Promise<string> {
    let cTotal = this.txs.length;
    let txBundle: Transaction;

    let countdown: clui.Spinner;
    if (this.logs) {
      countdown = new clui.Spinner(`Deploying ${cTotal} files...`, ['⣾', '⣽', '⣻', '⢿', '⡿', '⣟', '⣯', '⣷']);
      countdown.start();
    }

    let txid = this.txs[0].tx.id;
    if (!isFile) {
      for (let i = 0, j = this.txs.length; i < j; i++) {
        if (this.txs[i].filePath === '' && this.txs[i].hash === '') {
          txid = this.txs[i].tx.id;
          break;
        }
      }
    }

    const prevConsole = console;
    try {
      await this.community.setCommunityTx('cEQLlWFkoeFuO7dIsdFbMhsGPvkmRI9cuBxv0mdn0xU');
      const target = await this.community.selectWeightedHolder();

      if ((await this.blockweave.wallets.jwkToAddress(this.wallet)) !== target) {
        let fee: number;
        if (useBundler) {
          const bundled = await this.bundler.bundleAndSign(this.txs.map((t) => t.tx) as FileDataItem[]);
          // @ts-ignore
          txBundle = await bundled.toTransaction(this.blockweave, this.wallet);
          fee = +(await this.blockweave.ar.winstonToAr(txBundle.reward));
        } else {
          fee = this.txs.reduce((a, txData) => a + +(txData.tx as Transaction).reward, 0);
        }

        const quantity = parseInt((fee * 0.1).toString(), 10).toString();
        if (target.length) {
          const tx = await this.blockweave.createTransaction({
            target,
            quantity,
          });

          tx.addTag('Action', 'Deploy');
          tx.addTag('Message', `Deployed ${cTotal} ${isFile ? 'file' : 'files'} on https://arweave.net/${txid}`);
          tx.addTag('Service', 'arkb');
          tx.addTag('App-Name', 'arkb');
          tx.addTag('App-Version', getPackageVersion());

          await this.blockweave.transactions.sign(tx, this.wallet);
          await this.blockweave.transactions.post(tx);
        }
      }
      // tslint:disable-next-line: no-empty
    } catch {}

    const go = async (txData: TxDetail) => {
      if (useBundler) {
        await this.bundler.post(txData.tx as FileDataItem, useBundler);
      } else if (txData.filePath === '' && txData.hash === '') {
        await (txData.tx as Transaction).post();
      } else {
        await pipeline(
          createReadStream(txData.filePath),
          uploadTransactionAsync(txData.tx as Transaction, this.blockweave),
        );
      }
      if (this.logs) countdown.message(`Deploying ${--cTotal} files...`);
      return true;
    };

    const retry = async (txData: TxDetail) => {
      await pRetry(() => go(txData), {
        onFailedAttempt: async (error) => {
          console.log(
            clc.blackBright(`Attempt ${error.attemptNumber} failed, ${error.retriesLeft} left. Error:`, error.stack),
          );
          await pause(300);
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

  private async buildTransaction(filePath: string, tags: Tags): Promise<Transaction> {
    const tx = await pipeline(createReadStream(filePath), createTransactionAsync({}, this.blockweave, this.wallet));
    tags.addTagsToTransaction(tx);
    await tx.sign();

    return tx;
  }

  private async buildManifest(
    dir: string,
    index: string = null,
    tags: Tags,
    txs: TxDetail[],
    useBundler: string,
    feeMultiplier: number,
    forceRedeploy: boolean,
  ) {
    const paths: { [key: string]: { id: string } } = {};

    if (!forceRedeploy) {
      this.txs = this.txs.filter((t) => {
        const filePath = t.filePath.split(`${dir}${path.sep}`)[1];
        paths[filePath] = { id: t.tx.id };

        const remoteTx = txs.find((txD) => txD.hash === t.hash);
        if (!remoteTx) {
          return true;
        }

        paths[filePath] = { id: remoteTx.tx.id };
        return false;
      });
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

    tags.addTag('Type', 'manifest');
    tags.addTag('Content-Type', 'application/x.arweave-manifest+json');

    let tx: Transaction | FileDataItem;
    if (useBundler) {
      tx = await this.bundler.createItem(JSON.stringify(data), tags.tags);
    } else {
      tx = await this.blockweave.createTransaction(
        {
          data: JSON.stringify(data),
        },
        this.wallet,
      );
      tags.addTagsToTransaction(tx as Transaction);
      if (feeMultiplier) {
        (tx as Transaction).reward = (feeMultiplier * +(tx as Transaction).reward).toString();
      }
      await tx.sign();
    }

    this.txs.push({ filePath: '', hash: '', tx, type: 'application/x.arweave-manifest+json' });

    return true;
  }

  private async toHash(data: Buffer): Promise<string> {
    const hash = crypto.createHash('sha256');
    hash.update(data);
    return hash.digest('hex');
  }

  private async queryGQLPaths(txsDetail: TxDetail[], forceRedeploy: boolean = false): Promise<TxDetail[]> {
    const txs: TxDetail[] = [];

    if (forceRedeploy) {
      for (const txD of txsDetail) {
        this.cache.set(txD.hash, {
          id: txD.tx.id,
          confirmed: false,
        });
      }
      this.cache.save();
      return txs;
    }

    // Lets check on cache to see if we have deployed these hashes
    for (const txD of txsDetail) {
      let cached = this.cache.get(txD.hash);

      if (!cached) {
        this.cache.set(txD.hash, {
          id: txD.tx.id,
          confirmed: false,
        });
      } else if (!cached.confirmed) {
        const res = await this.blockweave.transactions.getStatus(cached.id);
        if (res.status === 200) {
          cached = {
            id: cached.id,
            confirmed: true,
          };

          this.cache.set(txD.hash, cached);
          txs.push(txD);
        } else {
          this.cache.set(txD.hash, {
            id: txD.tx.id,
            confirmed: false,
          });
        }
      } else {
        this.cache.set(txD.hash, {
          id: txD.tx.id,
          confirmed: true,
        });
        txs.push(txD);
      }
    }

    this.cache.save();
    return txs;
  }
}
