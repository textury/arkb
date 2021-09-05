#!/usr/bin/env node

import fs from 'fs';
import fg from 'fast-glob';
import clear from 'clear';
import figlet from 'figlet';
import minimist from 'minimist';
import Conf from 'conf';
import CLI from 'clui';
import clc from 'cli-color';
import Arweave from 'arweave';
import { JWKInterface } from 'arweave/node/lib/wallet';
import cliQuestions from './cli-questions';
import Crypter from './crypter';
import Deploy from './deploy';
import Transaction from 'arweave/node/lib/transaction';
import IPFS from './ipfs';
import { TxDetail } from './faces/txDetail';
import { FileDataItem } from 'ans104/file';
import Bundler from './bundler';
class App {
  private config: Conf;
  private arweave: Arweave;

  private debug: boolean = false;

  constructor() {
    this.config = new Conf();

    const argv = minimist(process.argv.slice(2));
    const hasArgs = Object.keys(argv).length > 1 || argv._.length;

    if (!hasArgs || argv.help) {
      this.showWelcome();
    } else if (argv.v || argv.version) {
      this.showVersion();
    }

    this.debug = argv.debug === true ? true : false;

    this.setArweaveInstance(argv);
    this.doArweaveTask(argv);
  }

  // Options tasks
  private showWelcome() {
    clear();
    console.log(clc.yellow(figlet.textSync('ARKB', 'Whimsy')));
    console.log(`Usage: arkb ${clc.cyan('[options]')} ${clc.green('[command]')}\n`);

    const Line = CLI.Line;
    new Line().column('Options', 40, [clc.cyan]).column('Description', 20, [clc.blackBright]).fill().output();

    const opts = [
      ['-v --version', 'Show the version number'],
      ['--host <host_or_ip>', 'Set the network hostname or ip'],
      ['--protocol <protocol>', 'Set the network protocol (http or https)'],
      ['--port <port>', 'Set the network port'],
      ['--ipfs-publish', 'Publish with Arweave+IPFS'],
      ['--use-bundler <host>', 'Use ans104 and bundler host'],
      ['--auto-confirm', 'Skips the confirm screen'],
      ['--timeout <timeout>', 'Set the request timeout'],
      ['--tag.Tag-Name=tagvalue', 'Set tags to your files'],
      ['--wallet <wallet_file_path>', 'Set the key file path'],
      ['--debug', 'Display additional logging'],
      ['-h --help', 'Display this message'],
    ];

    for (let i = 0, j = opts.length; i < j; i++) {
      new Line().column(opts[i][0], 40).column(opts[i][1], 50).fill().output();
    }

    const cmds = [
      [`deploy <dir_path> ${clc.cyan('[options]')}`, 'Deploy a directory'],
      ['status <tx_id>', 'Check the status of a transaction ID'],
      ['balance', 'Get the current balance of your wallet'],
      ['network', 'Get the current network info'],
      ['wallet-save <wallet_file_path>', 'Save a wallet to remove the need for the --wallet option'],
      ['wallet-export', 'Decrypt and export the saved wallet file'],
      ['wallet-forget', 'Forget your saved wallet file'],
    ];

    console.log('');

    new Line().column('Commands', 40, [clc.green]).column('Description', 20, [clc.blackBright]).fill().output();

    for (let i = 0, j = cmds.length; i < j; i++) {
      new Line().column(cmds[i][0], 40).column(cmds[i][1], 60).fill().output();
    }

    console.log(clc.magenta('\nExamples'));
    console.log('Without a saved wallet:');
    console.log('  arkb deploy folder/path/ --wallet path/to/my/wallet.json');

    console.log('\nSaving a wallet:');
    console.log('  arkb wallet-save path/to/wallet.json');
    console.log('  arkb deploy folder/path/');

    console.log('\nCustom index file:');
    console.log(' arkb deploy folder/path --index custom.html');

    process.exit(0);
  }

  private showVersion() {
    const version = require('../package.json').version;
    console.log(`v${version}`);
    process.exit(0);
  }

  private async doArweaveTask(argv: minimist.ParsedArgs) {
    const command = argv._[0];
    const cvalue = argv._[1];

    const tags: { name: string; value: string }[] = [];
    const tag = argv.tag;
    if (tag) {
      for (const name of Object.keys(tag)) {
        tags.push({ name, value: tag[name].toString() });
      }
    }

    if (command === 'deploy') {
      this.deploy(
        cvalue,
        argv.wallet,
        argv.index,
        argv['ipfs-publish'],
        argv['auto-confirm'],
        tags,
        argv['use-bundler'],
      );
    } else if (command === 'status') {
      this.status(cvalue);
    } else if (command === 'balance') {
      this.balance(cvalue);
    } else if (command === 'network') {
      this.network();
    } else if (command === 'wallet-save') {
      this.walletSave(cvalue);
    } else if (command === 'wallet-export') {
      this.walletExport();
    } else if (command === 'wallet-forget') {
      this.walletForget();
    }
  }

  // Arweave tasks
  private async deploy(
    dir: string,
    walletPath: string,
    index: string,
    toIpfs: boolean = false,
    confirm: boolean = false,
    tags: { name: string; value: string }[] = [],
    useBundler?: string,
  ) {
    const wallet: JWKInterface = await this.getWallet(walletPath);

    if (!this.dirExists(dir)) {
      console.log(clc.red("Directory doesn't exist"));
      process.exit(0);
    }

    let files = [dir];
    let isFile = true;
    if (fs.lstatSync(dir).isDirectory()) {
      files = await fg([`${dir}/**/*`], { dot: false });
      isFile = false;
    }

    const deploy = new Deploy(wallet, this.arweave, this.debug);

    if (!index) {
      index = 'index.html';
    }

    const txs = await deploy.prepare(dir, files, index, tags, toIpfs, useBundler);
    const balAfter = await this.showTxsDetails(txs, wallet, isFile, dir, useBundler, deploy.getBundler());

    if (balAfter < 0) {
      console.log(clc.red("You don't have enough balance for this deploy."));
      process.exit(0);
    }

    // Check if auto-confirm is added
    let res = { confirm: false };
    if (confirm) {
      res.confirm = true;
    } else {
      res = await cliQuestions.showConfirm();
    }
    if (!res.confirm) {
      console.log(clc.red('Rejected!'));
      process.exit(0);
    }

    if (toIpfs) {
      const ipfs = new IPFS();
      const ipfsHash = await ipfs.deploy(dir);

      console.log('');
      console.log(clc.green('IPFS deployed! Main CID:'));

      console.log(clc.cyan(ipfsHash.cid));
    }

    const manifestTx: string = await deploy.deploy(isFile, useBundler);

    console.log('');
    if (useBundler) {
      console.log(clc.green('Data items deployed!'));
    } else {
      console.log(clc.green('Files deployed! Visit the following URL to see your deployed content:'));
      console.log(
        clc.cyan(
          `${this.arweave.api.getConfig().protocol}://${this.arweave.api.getConfig().host}:${
            this.arweave.api.getConfig().port
          }/${manifestTx}`,
        ),
      );
    }

    process.exit(0);
  }

  private async status(txid: string) {
    try {
      const status = await this.arweave.transactions.getStatus(txid);
      console.log(`Confirmed: ${status.confirmed ? true : false} | Status: ${status.status}`);
    } catch (e) {
      console.log(clc.red('Invalid transaction ID.'));
      if (this.debug) console.log(e);
    }

    process.exit(0);
  }

  private async balance(walletPath: string) {
    const wallet: JWKInterface = await this.getWallet(walletPath);

    if (!wallet) {
      console.log(clc.red('Please set a wallet or run with the --wallet option.'));
      process.exit(0);
    }

    try {
      const addy = await this.arweave.wallets.jwkToAddress(wallet);
      const bal = await this.arweave.wallets.getBalance(addy);
      console.log(`${addy} has a balance of ${this.arweave.ar.winstonToAr(bal)}`);
    } catch (e) {
      console.log(clc.red('Unable to retrieve wallet balance.'));
      if (this.debug) console.log(e);
    }
  }

  private async network() {
    console.log(await this.arweave.network.getInfo());
  }

  // Other tasks
  private async walletSave(file: string) {
    try {
      const wallet = fs.readFileSync(file, 'utf8');
      const res = await cliQuestions.askWalletPassword('Set a password for your wallet');

      // @ts-ignore
      const crypter = new Crypter(res.password);
      const encWallet = crypter.encrypt(Buffer.from(wallet)).toString('base64');

      this.config.set('wallet', encWallet);
      console.log(clc.green('Wallet saved!'));
    } catch (e) {
      console.log(clc.red('Invalid wallet file.'));
      if (this.debug) console.log(e);
    }
  }

  private async walletExport() {
    const wallet: JWKInterface = await this.getWallet(null);

    try {
      const pubKey = await this.arweave.wallets.jwkToAddress(wallet);
      fs.writeFileSync(`${pubKey}.json`, JSON.stringify(wallet), 'utf8');
      console.log(clc.green(`Wallet "${clc.bold(`${pubKey}.json`)}" exported successfully.`));
    } catch (e) {
      console.log(clc.red('Unable to export the wallet file.'));
      if (this.debug) console.log(e);
    }
  }

  private async walletForget() {
    this.config.delete('wallet');
  }

  // Internal methods
  private async showTxsDetails(
    txs: TxDetail[],
    wallet: JWKInterface,
    isFile: boolean = false,
    dir: string,
    useBundler?: string,
    bundler?: Bundler,
  ): Promise<number> {
    let totalSize = 0;
    let deployFee = 0;

    const Line = CLI.Line;
    new Line()
      .column('ID', 45, [clc.cyan])
      .column('Size', 15, [clc.cyan])
      .column('Fee', 17, [clc.cyan])
      .column('Type', 30, [clc.cyan])
      .column('Path', 20, [clc.cyan])
      .fill()
      .output();

    for (let i = 0, j = txs.length; i < j; i++) {
      const tx = txs[i];
      let ar = '-';
      const reward = (tx.tx as Transaction).reward;
      if (reward) {
        ar = this.arweave.ar.winstonToAr(reward);
        deployFee += +reward;
      }

      let size = '-';
      const dataSize = (tx.tx as Transaction).data_size;
      if (dataSize) {
        size = this.bytesForHumans(+dataSize);
        totalSize += +dataSize;
      }

      let path = tx.filePath;
      if (path.startsWith(`${dir}/`)) {
        path = path.split(`${dir}/`)[1];
      }

      if (!path) {
        path = '';
      }

      new Line()
        .column(tx.tx.id, 45)
        .column(size, 15)
        .column(ar, 17)
        .column(tx.type, 30)
        .column(path, 20)
        .fill()
        .output();
    }

    if (useBundler) {
      const bundled = await bundler.bundleAndSign(txs.map((t) => t.tx) as FileDataItem[]);
      const txBundle = await bundled.toTransaction(this.arweave, wallet);
      deployFee = +txBundle.reward;

      totalSize = +txBundle.data_size;
    }

    const fee = parseInt((deployFee * 0.1).toString(), 10);

    const arFee = this.arweave.ar.winstonToAr(deployFee.toString());
    const serviceFee = this.arweave.ar.winstonToAr(fee.toString());
    const totalFee = this.arweave.ar.winstonToAr((deployFee + fee).toString());

    console.log('');
    console.log(clc.cyan('Summary'));
    if (useBundler) {
      console.log(`Number of data items: ${txs.length}`);
    } else {
      console.log(`Number of files: ${isFile ? txs.length : `${txs.length - 1} + 1 manifest`}`);
    }
    console.log(`Total size: ${this.bytesForHumans(totalSize)}`);
    console.log(`Fees: ${arFee} + ${serviceFee} (10% arkb fee)`);
    console.log(`Total fee: ${totalFee}`);

    const addy = await this.arweave.wallets.jwkToAddress(wallet);
    const winston = await this.arweave.wallets.getBalance(addy);
    const bal = this.arweave.ar.winstonToAr(winston);
    const balAfter = +bal - +totalFee;

    console.log('');
    console.log(clc.cyan('Wallet'));
    console.log(`Address: ${addy}`);
    console.log(`Current balance: ${bal}`);
    console.log(`Balance after deploy: ${balAfter}`);

    console.log('');

    return +balAfter;
  }

  private setArweaveInstance(argv: minimist.ParsedArgs) {
    const host = argv.host || 'arweave.net';
    const protocol = argv.protocol || 'https';
    const port = argv.port || 443;
    const timeout = argv.timeout || 20000;

    this.arweave = Arweave.init({
      host,
      port,
      protocol,
      timeout,
      logging: this.debug,
    });
  }

  private async getWallet(walletPath: string) {
    let wallet: JWKInterface;
    // @ts-ignore
    const walletEncr: string = this.config.get('wallet');

    if (walletPath) {
      if (typeof walletPath !== 'string') {
        console.log(clc.red('The wallet must be specified.'));
        process.exit(0);
      }

      try {
        wallet = JSON.parse(fs.readFileSync(walletPath, 'utf8'));
      } catch (e) {
        console.log(clc.red('Invalid wallet path.'));
        if (this.debug) console.log(e);
        process.exit(0);
      }
    }

    if (!wallet) {
      if (walletEncr) {
        const res = await cliQuestions.askWalletPassword();
        const crypter = new Crypter(res.password);
        try {
          const decrypted = crypter.decrypt(Buffer.from(walletEncr, 'base64'));
          wallet = JSON.parse(decrypted.toString());
        } catch (e) {
          console.log(clc.red('Invalid password.'));
          if (this.debug) console.log(e);
          process.exit(0);
        }
      }
    }

    if (!wallet) {
      console.log(clc.red('Save a wallet with `arkb wallet-save file-path.json`.'));
      process.exit(0);
    }

    return wallet;
  }

  private dirExists(dir: string) {
    return fs.existsSync(dir);
  }

  private bytesForHumans(bytes: number): string {
    const sizes = ['Bytes', 'kB', 'MB', 'GB', 'TB', 'PB', 'EB'];

    let output: string;

    sizes.forEach((unit, id) => {
      const s = Math.pow(1024, id);
      let fixed = '';
      if (bytes >= s) {
        fixed = String((bytes / s).toFixed(2));
        if (fixed.indexOf('.0') === fixed.length - 2) {
          fixed = fixed.slice(0, -2);
        }
        output = `${fixed} ${unit}`;
      }
    });

    if (!output) {
      return `0 Bytes`;
    }

    return output;
  }
}

const app = new App();
