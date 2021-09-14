import { JWKInterface } from 'arweave/node/lib/wallet';
import clc from 'cli-color';
import ArgumentsInterface from '../faces/arguments';
import CommandInterface from '../faces/command';
import { getWallet } from '../utils/wallet';

const command: CommandInterface = {
  name: 'balance',
  aliases: ['b'],
  description: 'Get the current balance of your wallet',
  useOptions: true,
  args: ['address'],
  execute: async (args: ArgumentsInterface): Promise<void> => {
    const { commandValue: walletPath, config, debug, arweave } = args;

    const wallet: JWKInterface = await getWallet(walletPath, config, debug);

    if (!wallet) {
      console.log(clc.red('Please set a wallet or run with the --wallet option.'));
      return;
    }

    try {
      const addy = await arweave.wallets.jwkToAddress(wallet);
      const bal = await arweave.wallets.getBalance(addy);
      console.log(
        `${clc.cyan(addy)} has a balance of ${clc.yellow(
          `AR ${arweave.ar.winstonToAr(bal, { formatted: true, decimals: 12, trim: true })}`,
        )}`,
      );
    } catch (e) {
      console.log(clc.red('Unable to retrieve wallet balance.'));
      if (debug) console.log(e);
    }
  }
};

export default command;