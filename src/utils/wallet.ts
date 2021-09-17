import fs from 'fs';
import { JWKInterface } from 'arweave/node/lib/wallet';
import clc from 'cli-color';
import cliQuestions from './cli-questions';
import Crypter from './crypter';
import Conf from 'conf';

export async function getWallet(walletPath: string, config: Conf, debug: boolean) {
  let wallet: JWKInterface;
  const walletEncr: string = config.get('wallet') as string;

  if (walletPath) {
    if (typeof walletPath !== 'string') {
      console.log(clc.red('The wallet must be specified.'));
      return;
    }

    try {
      wallet = JSON.parse(fs.readFileSync(walletPath, 'utf8'));
    } catch (e) {
      console.log(clc.red('Invalid wallet path.'));
      if (debug) console.log(e);
      return;
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
        if (debug) console.log(e);
        return;
      }
    }
  }

  if (!wallet) {
    console.log(clc.red('Save a wallet with `arkb wallet-save file-path.json`.'));
    return;
  }

  return wallet;
}
