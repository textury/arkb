import ArgumentsInterface from '../faces/arguments';
import { getWallet } from '../utils/wallet';
import CommandInterface from '../faces/command';
import walletOption from '../options/wallet';
import debugOption from '../options/debug';
import helpOption from '../options/help';
import timeoutOption from '../options/timeout';
import useBundlerOption from '../options/useBundler';
import noColorsOption from '../options/noColors';
import { JWKInterface } from 'blockweave/dist/faces/lib/wallet';
import { parseColor } from '../utils/utils';

const command: CommandInterface = {
  name: 'fund-bundler',
  description: 'Fund your bundler account',
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

    const amount = commandValues[0];
    const wallet: JWKInterface = await getWallet(walletPath, config, debug, colors);

    if (!wallet) {
      return;
    }

    if (!useBundler) {
      console.log(parseColor(colors, 'Please set bundler address', 'red'));
      return;
    }

    // Get the bundler address and make a non-data transaction to the address
    let bundlerAddress: string;
    try {
      const res = await bundler.get('/info');
      bundlerAddress = res.data.address || res.data.addresses.arweave;
    } catch (e) {
      console.log(parseColor(colors, 'Error getting bundler address, see more info with the --debug option.', 'red'));
      if (debug) console.log(e);
      process.exit(1);
    }

    // Fund the bundler address
    try {
      // const addy = await blockweave.wallets.jwkToAddress(wallet);
      const tx = await blockweave.createTransaction(
        {
          target: bundlerAddress,
          quantity: blockweave.ar.arToWinston(amount.toString()),
        },
        wallet,
      );

      tx.reward = parseInt(tx.reward, 10).toString();
      await blockweave.transactions.sign(tx, wallet);
      await blockweave.transactions.post(tx);

      console.log(parseColor(colors, `Bundler funded with ${amount.toString()} AR, transaction ID: ${tx.id}`, 'cyan'));
    } catch (e) {
      console.log(parseColor(colors, 'Error funding bundler address, see more info with the --debug option.', 'red'));
      if (debug) console.log(e);
    }
  },
};

export default command;
