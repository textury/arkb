import fs from 'fs';
import crypto from 'crypto';
import Arweave from 'arweave';
import mime from 'mime';
import clui from 'clui';
import Transaction from 'arweave/node/lib/transaction';
import { JWKInterface } from 'arweave/node/lib/wallet';
import { GQLEdgeInterface, GQLTagInterface, GQLTransactionsResultInterface } from './faces/gqlResult';
import chalk from 'chalk';

export default class Deploy {
  private wallet: JWKInterface;
  private arweave: Arweave;
  private txs: { path: string; hash: string; tx: Transaction; type: string }[];

  private debug: boolean = false;
  private logs: boolean = true;

  constructor(wallet: JWKInterface, arweave: Arweave, debug: boolean = false, logs: boolean = true) {
    this.wallet = wallet;
    this.arweave = arweave;
    this.debug = debug;
    this.logs = logs;
  }

  async prepare(
    dir: string,
    files: string[],
    index: string = 'index.html',
    tags: { name: string; value: string }[] = [],
  ) {
    this.txs = [];

    let leftToPrepare = files.length;
    let countdown: clui.Spinner;
    if(this.logs) {
      countdown = new clui.Spinner(`Preparing ${leftToPrepare} files...`, ['⣾', '⣽', '⣻', '⢿', '⡿', '⣟', '⣯', '⣷']);
      countdown.start();
    }

    await Promise.all(
      files.map(async (f) => {
        return new Promise((resolve, reject) => {
          fs.readFile(f, async (err, data) => {
            if (err) {
              console.log('Unable to read file ' + f);
              return reject();
            }

            if (!data || !data.length) {
              return resolve(true);
            }

            const hash = await this.toHash(data);
            const type = mime.getType(f);
            const tx = await this.buildTransaction(f, hash, data, type);
            this.txs.push({ path: f, hash, tx, type });

            if(this.logs) countdown.message(`Preparing ${--leftToPrepare} files...`);
            resolve(true);
          });
        });
      }),
    );

    await this.buildManifest(dir, index, tags);
    if(this.logs) countdown.stop();

    return this.txs;
  }

  async deploy() {
    let current = -1;
    let cTotal = this.txs.length;

    let countdown: clui.Spinner;
    if(this.logs) {
      const countdown = new clui.Spinner(`Deploying ${cTotal} files...`, ['⣾', '⣽', '⣻', '⢿', '⡿', '⣟', '⣯', '⣷']);
      countdown.start();
    }

    const go = async (index = 0) => {
      if (index >= this.txs.length) {
        return true;
      }

      const uploader = await this.arweave.transactions.getUploader(this.txs[index].tx);

      while (!uploader.isComplete) {
        await uploader.uploadChunk();
      }

      if(this.logs) countdown.message(`Deploying ${--cTotal} files...`);
      go(++current);
    };

    const gos = [];
    for (let i = 0, j = 5; i < j; i++) {
      gos.push(go(++current));
    }

    await Promise.all(gos);
    if(this.logs) countdown.stop();

    return;
  }

  private async buildTransaction(filePath: string, hash: string, data: Buffer, type: string): Promise<Transaction> {
    const tx = await this.arweave.createTransaction({ data }, this.wallet);

    tx.addTag('App-Name', 'arkb');
    tx.addTag('Type', 'file');
    tx.addTag('Content-Type', mime.getType(filePath));
    tx.addTag('File-Hash', hash);

    await this.arweave.transactions.sign(tx, this.wallet);
    return tx;
  }

  private async buildManifest(dir: string, index: string = null, customTags: { name: string; value: string }[]) {
    const paths: { [key: string]: { id: string } } = {};
    const hashes = this.txs.map((t) => t.hash);

    // Query to find all the files previously deployed
    const edges: GQLEdgeInterface[] = await this.queryGQLPaths(hashes);
    if (edges.length) {
      for (let i = 0, j = edges.length; i < j; i++) {
        const node = edges[i].node;
        const tags = await this.getTags(node.tags);

        for (let k = this.txs.length - 1; k >= 0; --k) {
          const t = this.txs[k];
          if (t.hash === tags['File-Hash']) {
            const path = `${t.path.split(`${dir}/`)[1]}`;
            paths[path] = { id: node.id };
            this.txs.splice(k, 1);
            break;
          }
        }
      }
    }

    for (let i = 0, j = this.txs.length; i < j; i++) {
      const t = this.txs[i];
      const path = `${t.path.split(`${dir}/`)[1]}`;
      t.path = path;
      paths[path] = { id: t.tx.id };
    }

    if (!index) {
      if (Object.keys(paths).includes('index.html')) {
        index = 'index.html';
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

    if (customTags.length) {
      for (const tag of customTags) {
        tx.addTag(tag.name, tag.value);
      }
    }

    tx.addTag('App-Name', 'arkb');
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

  private async queryGQLPaths(hashes: string[]): Promise<GQLEdgeInterface[]> {
    let hasNextPage = true;
    let edges: GQLEdgeInterface[] = [];
    let cursor: string = '';

    while (hasNextPage) {
      const query = {
        query: `query {
          transactions(
            tags: [
              {name: "App-Name", values: "arkb"},
              {name: "File-Hash", values: ${JSON.stringify(hashes)}},
              {name: "Type", values: "file"}
            ]
            first: 100
            after: "${cursor}"
          ) {
            pageInfo {
              hasNextPage
            }
            edges {
              cursor
              
              node {
                id
                recipient
                quantity {
                  winston
                  ar
                }
                owner {
                  address
                },
                tags {
                  name,
                  value
                }
                block {
                  timestamp
                  height
                }
              }
            }
          }
        }`,
      };

      let res: any;
      try {
        res = await this.arweave.api.post('https://arweave.dev/graphql', query);
      } catch (e) {
        console.log(chalk.red(`Unable to query ${this.arweave.getConfig().api.host}`));
        if (this.debug) console.log(e);
        return [];
      }

      const transactions: GQLTransactionsResultInterface = res.data.data.transactions;
      if (transactions.edges && transactions.edges.length) {
        edges = edges.concat(transactions.edges);
        cursor = transactions.edges[transactions.edges.length - 1].cursor;
      }

      hasNextPage = transactions.pageInfo.hasNextPage;
    }

    return edges;
  }

  private async getTags(tags: GQLTagInterface[]): Promise<any> {
    const res = {};

    for (let i = 0, j = tags.length; i < j; i++) {
      res[tags[i].name] = tags[i].value;
    }

    return res;
  }
}
