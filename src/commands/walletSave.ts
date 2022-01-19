import fs from 'fs';
import cliQuestions from '../utils/cli-questions';
import Crypter from '../utils/crypter';
import CommandInterface from '../faces/command';
import ArgumentsInterface from '../faces/arguments';
import noColorsOption from '../options/noColors';
import path from 'path';
import { parseColor } from '../utils/utils';

const command: CommandInterface = {
  name: 'wallet-save',
  aliases: ['ws'],
  description: `Saves a wallet, removes the need of the --wallet option`,
  args: ['wallet_path'],
  usage: [`folder${path.sep}keyfile.json`],
  options: [noColorsOption],
  execute: async (args: ArgumentsInterface): Promise<void> => {
    const { commandValues, config, debug, colors } = args;

    if (!commandValues || !commandValues.length) {
      console.log(parseColor(colors, 'Wallet path is required.', 'redBright'));
      return;
    }

    const walletPath = commandValues[0];
    try {
      const wallet = fs.readFileSync(walletPath, 'utf8');
      const res = await cliQuestions.askWalletPassword('Set a password for your wallet');

      const crypter = new Crypter(res.password);
      const encWallet = crypter.encrypt(Buffer.from(wallet)).toString('base64');

      config.set('wallet', encWallet);
      console.log(parseColor(colors, 'Wallet saved!', 'green'));
    } catch (e) {
      console.log(parseColor(colors, 'Invalid wallet file.', 'red'));
      if (debug) console.log(e);
    }
  },
};

export default command;
