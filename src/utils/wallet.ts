import fs from 'fs';
import { JWKInterface } from 'arweave/node/lib/wallet';
import cliQuestions from './cli-questions';
import Crypter from './crypter';
import Conf from 'conf';
import { parseColor } from './utils';

export async function getWallet(walletPath: string, config: Conf, debug: boolean, colors?: boolean) {
  let wallet: JWKInterface;
  const walletEncr: string = config.get('wallet') as string;

  if (walletPath) {
    if (typeof walletPath !== 'string') {
      console.log(parseColor(colors, 'The wallet must be specified.', 'red'));
      return;
    }

    try {
      wallet = JSON.parse(fs.readFileSync(walletPath, 'utf8'));
    } catch (e) {
      console.log(parseColor(colors, 'Invalid wallet path.', 'red'));
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
        console.log(parseColor(colors, 'Invalid password.', 'red'));
        if (debug) console.log(e);
        return;
      }
    }
  }

  if (!wallet) {
    console.log(parseColor(colors, 'Save a wallet with `arkb wallet-save file-path.json`.', 'red'));
    return;
  }

  return wallet;
}
