import ArgumentsInterface from '../faces/arguments';
import CommandInterface from '../faces/command';
import { getWallet } from '../utils/wallet';
import gatewayOption from '../options/gateway';
import timeoutOption from '../options/timeout';
import walletOption from '../options/wallet';
import debugOption from '../options/debug';
import helpOption from '../options/help';
import useBundlerOption from '../options/useBundler';
import noColorsOption from '../options/noColors';
import { JWKInterface } from 'blockweave/dist/faces/lib/wallet';
import Bundler from '../utils/bundler';
import { parseColor } from '../utils/utils';

const command: CommandInterface = {
  name: 'balance',
  aliases: ['b'],
  description: 'Get the current balance of your wallet',
  options: [gatewayOption, timeoutOption, walletOption, debugOption, helpOption, useBundlerOption, noColorsOption],
  execute: async (args: ArgumentsInterface): Promise<void> => {
    const { walletPath, config, debug, blockweave, useBundler, bundler, colors } = args;

    const wallet: JWKInterface = await getWallet(walletPath, config, debug);

    if (!wallet) {
      console.log(parseColor(colors, 'Please set a wallet or run with the --wallet option.', 'red'));
      return;
    }

    let addy: string;
    try {
      addy = await blockweave.wallets.jwkToAddress(wallet);
    } catch (e) {
      console.log(parseColor(colors, 'Unable to decrypt wallet address.', 'red'));
      if (debug) console.log(e);
    }

    if (useBundler) {
      try {
        const bal: number = await Bundler.getAddressBalance(bundler, addy);

        console.log(
          `${parseColor(colors, addy, 'cyan')} has a bundler balance of ${parseColor(
            colors,
            `AR ${blockweave.ar.winstonToAr(bal.toString(), { formatted: true, decimals: 12, trim: true })}`,
            'yellow',
          )}`,
        );
      } catch (e) {
        console.log(parseColor(colors, 'Unable to retrieve bundler balance.', 'red'));
        if (debug) console.log(e);
      }
      return;
    }

    try {
      const bal = await blockweave.wallets.getBalance(addy);
      console.log(
        `${parseColor(colors, addy, 'cyan')} has a balance of ${parseColor(
          colors,
          `AR ${blockweave.ar.winstonToAr(bal, { formatted: true, decimals: 12, trim: true })}`,
          'yellow',
        )}`,
      );
    } catch (e) {
      console.log(parseColor(colors, 'Unable to retrieve wallet balance', 'red'));
      if (debug) console.log(e);
    }
  },
};

export default command;
