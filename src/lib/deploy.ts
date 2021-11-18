import fs, { createReadStream } from 'fs';
import crypto from 'crypto';
import Blockweave from 'blockweave';
import mime from 'mime';
import clui from 'clui';
import clc from 'cli-color';
import PromisePool from '@supercharge/promise-pool';
import IPFS from '../utils/ipfs';
import Community from 'community-js';
import { pipeline } from 'stream/promises';
import { TxDetail } from '../faces/txDetail';
import { FileBundle, FileDataItem } from 'arbundles/file';
import Bundler from '../utils/bundler';
import Tags from '../lib/tags';
import { getPackageVersion } from '../utils/utils';
import { JWKInterface } from 'blockweave/dist/faces/lib/wallet';
import Transaction from 'blockweave/dist/lib/transaction';
import { createTransactionAsync, uploadTransactionAsync } from 'arweave-stream-tx';
import Arweave from 'arweave';
import Cache from '../utils/cache';

export default class Deploy {
  private wallet: JWKInterface;
  private blockweave: Blockweave;
  private arweave: Arweave;
  private bundler: Bundler;
  private ipfs: IPFS = new IPFS();
  private cache: Cache;
  private txs: TxDetail[];
  private duplicates: { hash: string; id: string; filePath: string }[] = [];

  private community: Community;

  private bundle: FileBundle;
  private bundledTx: Transaction;

  constructor(
    wallet: JWKInterface,
    blockweave: Blockweave,
    public readonly debug: boolean = false,
    public readonly threads: number = 0,
    public readonly logs: boolean = true,
    public readonly localBundle: boolean = false,
  ) {
    this.wallet = wallet;
    this.blockweave = blockweave;

    this.arweave = Arweave.init({
      host: blockweave.config.host,
      port: blockweave.config.port,
      protocol: blockweave.config.protocol,
      timeout: blockweave.config.timeout,
      logging: blockweave.config.logging,
    });

    this.cache = new Cache(
      debug,
      this.arweave.getConfig().api.host === 'localhost' || this.arweave.getConfig().api.host === '127.0.0.1',
    );
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

  getBundle(): FileBundle {
    return this.bundle;
  }

  getBundledTx(): Transaction {
    return this.bundledTx;
  }

  async prepare(
    dir: string,
    files: string[],
    index: string = 'index.html',
    tags: Tags = new Tags(),
    toIpfs: boolean = false,
    license?: string,
    useBundler?: string,
    feeMultiplier?: number,
    forceRedeploy: boolean = false,
  ) {
    this.txs = [];

    if (typeof license === 'string' && license.length > 0) {
      tags.addTag('License', license);
    }

    if (useBundler) {
      tags.addTag('Bundler', useBundler);
      tags.addTag('Bundle', 'ans104');
    }

    let leftToPrepare = files.length;
    let countdown: clui.Spinner;
    if (this.logs) {
      countdown = new clui.Spinner(`Preparing ${leftToPrepare} files...`, ['⣾', '⣽', '⣻', '⢿', '⡿', '⣟', '⣯', '⣷']);
      countdown.start();
    }

    await PromisePool.for(files)
      .withConcurrency(this.threads)
      .process(async (filePath: string) => {
        if (this.logs) countdown.message(`Preparing ${leftToPrepare--} files...`);

        let data: Buffer;
        try {
          data = fs.readFileSync(filePath);
        } catch (e) {
          console.log('Unable to read file ' + filePath);
          throw new Error(`Unable to read file: ${filePath}`);
        }

        if (!data || !data.length) {
          return;
        }

        const hash = await this.toHash(data);

        if (!forceRedeploy && this.cache.has(hash)) {
          const cached = this.cache.get(hash);
          let confirmed = cached.confirmed;

          if (!confirmed) {
            // tslint:disable-next-line: no-empty
            const res = await this.arweave.api.get(`tx/${cached.id}/status`).catch(() => {});
            if (res && res.data && res.data.number_of_confirmations) {
              confirmed = true;
            }
          }

          if (confirmed) {
            this.cache.set(hash, { ...cached, confirmed: true });

            this.duplicates.push({
              hash,
              id: cached.id,
              filePath,
            });
            return;
          }
        }

        const type = mime.getType(filePath) || 'application/octet-stream';
        const newTags = new Tags();
        for (const tag of newTags.tags) {
          newTags.addTag(tag.name, tag.value);
        }

        // Add/replace default tags
        if (toIpfs) {
          const ipfsHash = await this.ipfs.hash(data);
          newTags.addTag('IPFS-Add', ipfsHash);
        }
        newTags.addTag('User-Agent', `arkb`);
        newTags.addTag('User-Agent-Version', getPackageVersion());
        newTags.addTag('Type', 'file');
        if (type) newTags.addTag('Content-Type', type);
        newTags.addTag('File-Hash', hash);

        let tx: Transaction | FileDataItem;
        if (useBundler || this.localBundle) {
          tx = await this.bundler.createItem(data, newTags.tags);
        } else {
          tx = await this.buildTransaction(filePath, newTags);
          if (feeMultiplier && feeMultiplier > 1) {
            (tx as Transaction).reward = parseInt(
              (feeMultiplier * +(tx as Transaction).reward).toString(),
              10,
            ).toString();
          }
        }

        this.cache.set(hash, {
          id: tx.id,
          confirmed: false,
        });

        this.txs.push({ filePath, hash, tx, type });
      });

    if (this.logs) countdown.stop();

    const isFile = this.txs.length === 1 && this.txs[0].filePath === dir;
    if (isFile && this.duplicates.length) {
      console.log(clc.red('File already deployed:'));

      if (toIpfs) {
        const data = fs.readFileSync(files[0]);
        const cid = await this.ipfs.hash(data);
        console.log(`IPFS: ${clc.cyan(cid)}`);
      }

      console.log('Arweave: ' + clc.cyan(`${this.blockweave.config.url}/${this.duplicates[0].id}`));
      return;
    }

    if (this.logs) {
      countdown = new clui.Spinner(`Building manifest...`, ['⣾', '⣽', '⣻', '⢿', '⡿', '⣟', '⣯', '⣷']);
      countdown.start();
    }

    await this.buildManifest(dir, index, tags, useBundler, feeMultiplier);
    if (this.logs) countdown.stop();

    if (useBundler || this.localBundle) {
      this.bundle = await this.bundler.bundleAndSign(this.txs.map((t) => t.tx) as FileDataItem[]);

      // @ts-ignore
      this.bundledTx = await this.bundle.toTransaction(this.arweave, this.wallet);

      // @ts-ignore
      await this.arweave.transactions.sign(this.bundledTx, this.wallet);
    }

    return this.txs;
  }

  async deploy(isFile: boolean = false, useBundler?: string): Promise<string> {
    let cTotal = this.localBundle ? 1 : this.txs.length;

    let countdown: clui.Spinner;
    if (this.logs) {
      countdown = new clui.Spinner(`Deploying ${cTotal} file${cTotal === 1 ? '' : 's'}...`, [
        '⣾',
        '⣽',
        '⣻',
        '⢿',
        '⡿',
        '⣟',
        '⣯',
        '⣷',
      ]);
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

    try {
      const res = await this.arweave.api.get('cEQLlWFkoeFuO7dIsdFbMhsGPvkmRI9cuBxv0mdn0xU');
      if (!res || res.status !== 200) {
        throw new Error('Unable to get cEQLlWFkoeFuO7dIsdFbMhsGPvkmRI9cuBxv0mdn0xU');
      }

      await this.community.setCommunityTx('cEQLlWFkoeFuO7dIsdFbMhsGPvkmRI9cuBxv0mdn0xU');
      const target = await this.community.selectWeightedHolder();

      if (target && (await this.blockweave.wallets.jwkToAddress(this.wallet)) !== target) {
        let fee: number;
        if (useBundler || this.localBundle) {
          fee = +this.bundledTx.reward;
        } else {
          fee = this.txs.reduce((a, txData) => a + +(txData.tx as Transaction).reward, 0);
        }

        const quantity = parseInt((fee * 0.1).toString(), 10).toString();
        if (target.length) {
          const tx = await this.blockweave.createTransaction(
            {
              target,
              quantity,
            },
            this.wallet,
          );

          let files = `file${cTotal} ${isFile ? '' : 's'}`;
          if (useBundler) {
            files = `data item${cTotal} ${isFile ? '' : 's'}`;
          }

          let actionMessage = `Deployed ${files} on https://arweave.net/${txid}`;
          if (this.localBundle) {
            actionMessage = `Deployed a bundle with ${files}, bundle ID ${this.bundledTx.id} on https://arweave.net/${txid}`;
          }

          tx.addTag('Action', 'Deploy');
          tx.addTag('Message', actionMessage);
          tx.addTag('Service', 'arkb');
          tx.addTag('App-Name', 'arkb');
          tx.addTag('App-Version', getPackageVersion());

          await tx.signAndPost();
        }
      }
      // tslint:disable-next-line: no-empty
    } catch {}

    let toDeploy: TxDetail[] = this.txs;
    if (this.localBundle) {
      const hash = await this.toHash(await this.bundle.getRaw());
      toDeploy = [
        {
          filePath: '',
          hash,
          tx: this.bundledTx,
          type: 'Bundle',
        },
      ];
    }

    await PromisePool.for(toDeploy)
      .withConcurrency(this.threads)
      .process(async (txData) => {
        if (this.logs) countdown.message(`Deploying ${cTotal--} files...`);
        let deployed = false;

        if (useBundler) {
          try {
            await this.bundler.post(txData.tx as FileDataItem, useBundler);
            deployed = true;
          } catch (e) {
            console.log(e);
            console.log(clc.red('Failed to deploy data item:', txData.filePath));
          }
        } else if (this.localBundle) {
          console.log('inside');
          const txRes = await this.bundle.signAndSubmit(this.arweave, this.wallet);
          console.log(txRes);
        }

        if (txData.filePath === '' && txData.hash === '') {
          await (txData.tx as Transaction).post(0);
          deployed = true;
        }

        if (!deployed) {
          try {
            await pipeline(
              createReadStream(txData.filePath),
              // @ts-ignore
              uploadTransactionAsync(txData.tx as Transaction, this.blockweave),
            );
            deployed = true;
          } catch (e) {
            if (this.debug) {
              console.log(e);
              console.log(
                clc.red(`Failed to upload ${txData.filePath} using uploadTransactionAsync, trying normal upload...`),
              );
            }
          }
        }

        if (!deployed) {
          try {
            await (txData.tx as Transaction).post(0);
            deployed = true;
          } catch (e) {
            if (this.debug) {
              console.log(e);
              console.log(clc.red(`Failed to upload ${txData.filePath} using normal post!`));
            }
          }
        }
      });

    if (this.logs) countdown.stop();
    await this.cache.save();

    return txid;
  }

  private async buildTransaction(filePath: string, tags: Tags): Promise<Transaction> {
    const tx = await pipeline(createReadStream(filePath), createTransactionAsync({}, this.arweave, this.wallet));
    tags.addTagsToTransaction(tx);
    await this.arweave.transactions.sign(tx, this.wallet);

    // @ts-ignore
    return tx;
  }

  private async buildManifest(
    dir: string,
    index: string = null,
    tags: Tags,
    useBundler: string,
    feeMultiplier: number,
  ) {
    const { results: pDuplicates } = await PromisePool.for(this.duplicates)
      .withConcurrency(this.threads)
      .process(async (txD) => {
        const filePath = txD.filePath.split(`${dir}/`)[1];
        return [filePath, { id: txD.id }];
      });

    const { results: pTxs } = await PromisePool.for(this.txs)
      .withConcurrency(this.threads)
      .process(async (txD) => {
        const filePath = txD.filePath.split(`${dir}/`)[1];
        return [filePath, { id: txD.tx.id }];
      });

    const paths = pDuplicates.concat(pTxs).reduce((acc, cur) => {
      // @ts-ignore
      acc[cur[0]] = cur[1];
      return acc;
    }, {});

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
    if (useBundler || this.localBundle) {
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
        (tx as Transaction).reward = parseInt((feeMultiplier * +(tx as Transaction).reward).toString(), 10).toString();
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
}
