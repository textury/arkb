import fs from 'fs';
import Arweave from 'arweave';
import { JWKInterface } from 'arweave/node/lib/wallet';
import clc from 'cli-color';
import cliQuestions from '../utils/cli-questions';
import Crypter from '../utils/crypter';
import Conf from 'conf';
import { getWallet } from '../utils/wallet';

export async function cliWalletSave(file: string, config: Conf, debug: boolean): Promise<void> {
  try {
    const wallet = fs.readFileSync(file, 'utf8');
    const res = await cliQuestions.askWalletPassword('Set a password for your wallet');

    // @ts-ignore
    const crypter = new Crypter(res.password);
    const encWallet = crypter.encrypt(Buffer.from(wallet)).toString('base64');

    config.set('wallet', encWallet);
    console.log(clc.green('Wallet saved!'));
  } catch (e) {
    console.log(clc.red('Invalid wallet file.'));
    if (debug) console.log(e);
  }

  process.exit(0);
}

export async function cliWalletExport(arweave: Arweave, config: Conf, debug: boolean): Promise<void> {
  const wallet: JWKInterface = await getWallet(null, config, debug);

  try {
    const pubKey = await arweave.wallets.jwkToAddress(wallet);
    fs.writeFileSync(`${pubKey}.json`, JSON.stringify(wallet), 'utf8');
    console.log(clc.green(`Wallet "${clc.bold(`${pubKey}.json`)}" exported successfully.`));
  } catch (e) {
    console.log(clc.red('Unable to export the wallet file.'));
    if (debug) console.log(e);
  }

  process.exit(0);
}

export function cliWalletForget(config: Conf, debug: boolean): Promise<void> {
  try {
    config.delete('wallet');
  } catch (e) {
    console.log(clc.red('Unable to forget the wallet.'));
    if (debug) console.log(e);
  }

  process.exit(0);
}
