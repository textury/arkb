import ArgumentsInterface from '../faces/arguments';
import CommandInterface from '../faces/command';
import { getWallet } from '../utils/wallet';
import walletOption from '../options/wallet';
import debugOption from '../options/debug';
import helpOption from '../options/help';
import timeoutOption from '../options/timeout';
import useBundlerOption from '../options/useBundler';
import noColorsOption from '../options/noColors';
import { JWKInterface } from 'blockweave/dist/faces/lib/wallet';
import Transfer from '../lib/transfer';
import { parseColor } from '../utils/utils';

const command: CommandInterface = {
  name: 'withdraw-bundler',
  description: 'Withdraw from your bundler balance',
  args: ['amount'],
  usage: ['0.3'],
  options: [walletOption, debugOption, helpOption, timeoutOption, useBundlerOption, noColorsOption],
  execute: async (args: ArgumentsInterface): Promise<void> => {
    const { walletPath, bundler, debug, config, blockweave, commandValues, useBundler, colors } = args;

    // Check if we have received a command value
    if (!commandValues || !commandValues.length) {
      console.log(parseColor(colors, 'You forgot to set the amount.', 'red'));
      return;
    }

    // amount in ar
    const amnt = commandValues[0];
    const amount = parseInt(blockweave.ar.arToWinston(amnt), 10);
    const wallet: JWKInterface = await getWallet(walletPath, config, debug, colors);

    if (!wallet) {
      return;
    }

    if (!useBundler) {
      console.log(parseColor(colors, 'Please set bundler address', 'red'));
      return;
    }

    // Initiate withdrawal
    try {
      const transfer = new Transfer(wallet, blockweave);

      const addy = await transfer.withdrawBundler(bundler, amount);
      if (!addy) {
        console.log(parseColor(colors, 'Error withdrawing to wallet', 'red'));
        return;
      }

      // Success response
      console.log(`${parseColor(colors, addy, 'cyan')} has been funded with ${parseColor(colors, `AR ${amnt} from bundler.`)}`, 'yellow');
    } catch (e) {
      console.log(parseColor(colors, 'Error withdrawing to wallet', 'red'));
      if (debug) console.log(e);
      return;
    }
  },
};

export default command;
