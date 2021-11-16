import clc from 'cli-color';
import ArgumentsInterface from '../faces/arguments';
import CommandInterface from '../faces/command';
import { getWallet } from '../utils/wallet';
import gatewayOption from '../options/gateway';
import timeoutOption from '../options/timeout';
import walletOption from '../options/wallet';
import debugOption from '../options/debug';
import helpOption from '../options/help';
import { JWKInterface } from 'blockweave/dist/faces/lib/wallet';
import Bundler from '../utils/bundler';

const command: CommandInterface = {
  name: 'balance',
  aliases: ['b'],
  description: 'Get the current balance of your wallet',
  options: [gatewayOption, timeoutOption, walletOption, debugOption, helpOption],
  execute: async (args: ArgumentsInterface): Promise<void> => {
    const { walletPath, config, debug, blockweave, useBundler, bundler } = args;

    const wallet: JWKInterface = await getWallet(walletPath, config, debug);

    if (!wallet) {
      console.log(clc.red('Please set a wallet or run with the --wallet option.'));
      return;
    }

    let addy: string;
    try {
      addy = await blockweave.wallets.jwkToAddress(wallet);
    } catch (e) {
      console.log(clc.red('Unable to decrypt wallet address.'));
      if (debug) console.log(e);
    }

    if (useBundler) {
      try {
        const bal: number = await Bundler.getAddressBalance(bundler, addy);

        console.log(
          `${clc.cyan(addy)} has a bundler balance of ${clc.yellow(
            `AR ${blockweave.ar.winstonToAr(bal.toString(), { formatted: true, decimals: 12, trim: true })}`,
          )}`,
        );
      } catch (e) {
        console.log(clc.red('Unable to retrieve bundler balance.'));
        if (debug) console.log(e);
      }
      return;
    }

    try {
      const bal = await blockweave.wallets.getBalance(addy);
      console.log(
        `${clc.cyan(addy)} has a balance of ${clc.yellow(
          `AR ${blockweave.ar.winstonToAr(bal, { formatted: true, decimals: 12, trim: true })}`,
        )}`,
      );
    } catch (e) {
      console.log(clc.red('Unable to retrieve wallet balance.'));
      if (debug) console.log(e);
    }
  },
};

export default command;
