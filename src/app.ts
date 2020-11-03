#!/usr/bin/env node

import fs from 'fs';
import fg from 'fast-glob';
import clear from 'clear';
import chalk from 'chalk';
import figlet from 'figlet';
import minimist from 'minimist';
import Conf from 'conf';
import CLI from 'clui';
import Arweave from 'arweave';
import { JWKInterface } from 'arweave/node/lib/wallet';
import cliQuestions from './cli-questions';
import Crypter from './crypter';
import Deploy from './deploy';
import Transaction from 'arweave/node/lib/transaction';

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
    console.log(chalk.yellow(figlet.textSync('ARKB', 'Whimsy')));
    console.log(`Usage: arkb ${chalk.cyan('[options]')} ${chalk.green('[command]')}\n`);

    const Line = CLI.Line;
    new Line().column('Options', 40, [chalk.cyan]).column('Description', 20, [chalk.grey]).fill().output();

    const opts = [
      ['-v --version', 'Show the version number'],
      ['--host <host_or_ip>', 'Set the network hostname or ip'],
      ['--protocol <protocol>', 'Set the network protocol (http or https)'],
      ['--port <port>', 'Set the netwrok port'],
      ['--timeout <timeout>', 'Set the request timeout'],
      ['--wallet <wallet_file_path>', 'Set the key file path'],
      ['--debug', 'Display additional logging'],
      ['-h --help', 'Display this message'],
    ];

    for (let i = 0, j = opts.length; i < j; i++) {
      new Line().column(opts[i][0], 40).column(opts[i][1], 50).fill().output();
    }

    const cmds = [
      [`deploy <dir_path> ${chalk.cyan('[options]')}`, 'Deploy a directory'],
      ['status <tx_id>', 'Check the status of a transaction ID'],
      ['balance', 'Get the current balance of your wallet'],
      ['network', 'Get the current network info'],
      ['wallet-save <wallet_file_path>', 'Save a wallet to remove the need for the --wallet option'],
      ['wallet-export', 'Decrypt and export the saved wallet file'],
      ['wallet-forget', 'Forget your saved wallet file'],
    ];

    console.log('');

    new Line().column('Commands', 40, [chalk.green]).column('Description', 20, [chalk.grey]).fill().output();

    for (let i = 0, j = cmds.length; i < j; i++) {
      new Line().column(cmds[i][0], 40).column(cmds[i][1], 60).fill().output();
    }

    console.log(chalk.magenta('\nExamples'));
    console.log('Without saving a wallet:');
    console.log('  arkb deploy folder/path/ --wallet path/to/my/wallet.json');

    console.log('\nSaving a wallet:');
    console.log('  arkb wallet-save path/to/wallet.json');
    console.log('  arkb deploy folder/path/');
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
    if (command === 'deploy') {
      this.deploy(cvalue, argv.wallet);
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
  private async deploy(dir: string, walletPath: string) {
    const wallet: JWKInterface = await this.getWallet(walletPath);

    if (!this.dirExists(dir)) {
      console.log(chalk.red("Directory doesn't exist"));
      process.exit(0);
    }

    const entries = await fg([`${dir}/**/*`], { dot: false });
    const deploy = new Deploy(wallet, this.arweave, this.debug);

    const txs = await deploy.prepare(dir, entries);
    const balAfter = await this.showTxsDetails(txs, wallet);

    if (balAfter < 0) {
      console.log(chalk.red("You don't have enough balance for this deploy."));
      process.exit(0);
    }

    const res = await cliQuestions.showConfirm();
    if (!res.confirm) {
      console.log(chalk.red('Rejected!'));
      process.exit(0);
    }

    await deploy.deploy();
    console.log('');
    console.log(chalk.green('Files deployed! Visit the following URL to see your deployed content:'));

    let manifestTx = '';
    for (let i = 0, j = txs.length; i < j; i++) {
      if (txs[i].path === '' && txs[i].hash === '') {
        manifestTx = txs[i].tx.id;
      }
    }

    console.log(
      chalk.cyan(`${this.arweave.api.getConfig().protocol}://${this.arweave.api.getConfig().host}/${manifestTx}`),
    );
  }

  private async status(txid: string) {
    try {
      const status = await this.arweave.transactions.getStatus(txid);
      console.log(`Confirmed: ${status.confirmed ? true : false} | Status: ${status.status}`);
    } catch (e) {
      console.log(chalk.red('Invalid transaction ID.'));
      if (this.debug) console.log(e);
    }

    process.exit(0);
  }

  private async balance(walletPath: string) {
    const wallet: JWKInterface = await this.getWallet(walletPath);

    if (!wallet) {
      console.log(chalk.red('Please set a wallet or run with the --wallet option.'));
      process.exit(0);
    }

    try {
      const addy = await this.arweave.wallets.jwkToAddress(wallet);
      const bal = await this.arweave.wallets.getBalance(addy);
      console.log(`${addy} has a balance of ${this.arweave.ar.winstonToAr(bal)}`);
    } catch (e) {
      console.log(chalk.red('Unable to retrieve wallet balance.'));
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
      console.log(chalk.green('Wallet saved!'));
    } catch (e) {
      console.log(chalk.red('Invalid wallet file.'));
      if (this.debug) console.log(e);
    }
  }

  private async walletExport() {
    const wallet: JWKInterface = await this.getWallet(null);

    try {
      const pubKey = await this.arweave.wallets.jwkToAddress(wallet);
      fs.writeFileSync(`${pubKey}.json`, JSON.stringify(wallet), 'utf8');
      console.log(chalk.green(`Wallet "${chalk.bold(`${pubKey}.json`)}" exported successfully.`));
    } catch (e) {
      console.log(chalk.red('Unable to export the wallet file.'));
      if (this.debug) console.log(e);
    }
  }

  private async walletForget() {
    this.config.delete('wallet');
  }

  // Internal methods
  private async showTxsDetails(
    txs: { path: string; hash: string; tx: Transaction; type: string }[],
    wallet: JWKInterface,
  ): Promise<number> {
    let totalSize = 0;
    let totalFee = 0;

    const Line = CLI.Line;
    new Line()
      .column('ID', 45, [chalk.cyan])
      .column('Size', 15, [chalk.cyan])
      .column('Fee', 17, [chalk.cyan])
      .column('Type', 30, [chalk.cyan])
      .column('Path', 20, [chalk.cyan])
      .fill()
      .output();

    for (let i = 0, j = txs.length; i < j; i++) {
      const tx = txs[i];
      const ar = this.arweave.ar.winstonToAr(tx.tx.reward);

      const size = this.bytesForHumans(+tx.tx.data_size);
      totalSize += +tx.tx.data_size;
      totalFee += +tx.tx.reward;

      new Line()
        .column(tx.tx.id, 45)
        .column(size, 15)
        .column(ar, 17)
        .column(tx.type, 30)
        .column(tx.path, 20)
        .fill()
        .output();
    }

    const arFee = this.arweave.ar.winstonToAr(totalFee.toString());
    console.log('');
    console.log(chalk.cyan('Summary'));
    console.log(`Number of files: ${txs.length - 1} + 1 manifest`);
    console.log(`Total size: ${this.bytesForHumans(totalSize)}`);
    console.log(`Total price: ${arFee}`);

    const addy = await this.arweave.wallets.jwkToAddress(wallet);
    const winston = await this.arweave.wallets.getBalance(addy);
    const bal = this.arweave.ar.winstonToAr(winston);
    const balAfter = +bal - +arFee;
    console.log('');
    console.log(chalk.cyan('Wallet'));
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
        console.log(chalk.red('The wallet must be specified.'));
        process.exit(0);
      }

      try {
        wallet = JSON.parse(fs.readFileSync(walletPath, 'utf8'));
      } catch (e) {
        console.log(chalk.red('Invalid wallet path.'));
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
          console.log(chalk.red('Invalid password.'));
          if (this.debug) console.log(e);
          process.exit(0);
        }
      }
    }

    if (!wallet) {
      console.log(chalk.red('Save a wallet with `arkb wallet-save file-path.json`.'));
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
