import fs from 'fs';
import { getWallet } from '../utils/wallet';
import CommandInterface from '../faces/command';
import ArgumentsInterface from '../faces/arguments';
import noColorsOption from '../options/noColors';
import { JWKInterface } from 'blockweave/dist/faces/lib/wallet';
import { parseColor } from '../utils/utils';

const command: CommandInterface = {
  name: 'wallet-export',
  aliases: ['we'],
  description: `Exports a previously saved wallet`,
  options: [noColorsOption],
  execute: async (args: ArgumentsInterface): Promise<void> => {
    const { config, blockweave, debug, colors } = args;

    const wallet: JWKInterface = await getWallet(null, config, debug, colors);
    if (!wallet) {
      console.log(parseColor(colors, 'Please set a wallet or run with the --wallet option.', 'red'));
      return;
    }

    try {
      const address = await blockweave.wallets.jwkToAddress(wallet);
      fs.writeFileSync(`${address}.json`, JSON.stringify(wallet), 'utf8');
      console.log(parseColor(colors, `Wallet "${parseColor(colors, `${address}.json`, 'bold')}" exported successfully.`, 'green'));
    } catch (e) {
      console.log(parseColor(colors, 'Unable to export the wallet file.', 'red'));
      if (debug) console.log(e);
    }
  },
};

export default command;
