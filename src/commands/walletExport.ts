import fs from 'fs';
import clc from 'cli-color';
import { getWallet } from '../utils/wallet';
import CommandInterface from '../faces/command';
import ArgumentsInterface from '../faces/arguments';
import { JWKInterface } from 'blockweave/dist/faces/lib/wallet';

const command: CommandInterface = {
  name: 'wallet-export',
  aliases: ['we'],
  description: `Exports a previously saved wallet`,
  execute: async (args: ArgumentsInterface): Promise<void> => {
    const { config, blockweave, debug } = args;

    const wallet: JWKInterface = await getWallet(null, config, debug);
    if (!wallet) {
      console.log(clc.red('Please set a wallet or run with the --wallet option.'));
      return;
    }

    try {
      const address = await blockweave.wallets.jwkToAddress(wallet);
      fs.writeFileSync(`${address}.json`, JSON.stringify(wallet), 'utf8');
      console.log(clc.green(`Wallet "${clc.bold(`${address}.json`)}" exported successfully.`));
    } catch (e) {
      console.log(clc.red('Unable to export the wallet file.'));
      if (debug) console.log(e);
    }
  },
};

export default command;
