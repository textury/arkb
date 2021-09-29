import fs from 'fs';
import clc from 'cli-color';
import cliQuestions from '../utils/cli-questions';
import Crypter from '../utils/crypter';
import CommandInterface from '../faces/command';
import ArgumentsInterface from '../faces/arguments';
import path from 'path';

const command: CommandInterface = {
  name: 'wallet-save',
  aliases: ['ws'],
  description: `Saves a wallet, removes the need of the --wallet option`,
  args: ['wallet_path'],
  usage: [`folder/${path.sep}keyfile.json`],
  execute: async (args: ArgumentsInterface): Promise<void> => {
    const { commandValues, config, debug } = args;

    if (!commandValues || !commandValues.length) {
      console.log(clc.redBright('Wallet path is required.'));
      return;
    }

    const walletPath = commandValues[0];
    try {
      const wallet = fs.readFileSync(walletPath, 'utf8');
      const res = await cliQuestions.askWalletPassword('Set a password for your wallet');

      const crypter = new Crypter(res.password);
      const encWallet = crypter.encrypt(Buffer.from(wallet)).toString('base64');

      config.set('wallet', encWallet);
      console.log(clc.green('Wallet saved!'));
    } catch (e) {
      console.log(clc.red('Invalid wallet file.'));
      if (debug) console.log(e);
    }
  },
};

export default command;
