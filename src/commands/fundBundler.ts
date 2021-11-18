import clc from 'cli-color';
import ArgumentsInterface from '../faces/arguments';
import { getWallet } from '../utils/wallet';
import CommandInterface from '../faces/command';
import walletOption from '../options/wallet';
import debugOption from '../options/debug';
import helpOption from '../options/help';
import timeoutOption from '../options/timeout';
import useBundlerOption from '../options/useBundler';
import { JWKInterface } from 'blockweave/dist/faces/lib/wallet';

const command: CommandInterface = {
  name: 'fund-bundler',
  description: 'Fund your bundler account',
  args: ['amount_in_ar'],
  usage: ['0.3'],
  options: [walletOption, debugOption, helpOption, timeoutOption, useBundlerOption],
  execute: async (args: ArgumentsInterface): Promise<void> => {
    const { walletPath, bundler, debug, config, blockweave, commandValues, useBundler } = args;

    // Check if we have received a command value
    if (!commandValues || !commandValues.length) {
      console.log(clc.red('You forgot to set the amount.'));
      return;
    }

    const amount = commandValues[0];
    const wallet: JWKInterface = await getWallet(walletPath, config, debug);

    if (!wallet) {
      return;
    }

    if (!useBundler) {
      console.log(clc.red('Please set bundler address'));
      return;
    }

    // Get the bundler address and make a non-data transaction to the address
    let bundlerAddress: string;
    try {
      const res = await bundler.get('/info');
      bundlerAddress = res.data.address || res.data.addresses.arweave;
    } catch (e) {
      clc.red('Error getting bundler address, see more info with the --debug option.');
      if (debug) console.log(e);
      process.exit(1);
    }

    // Fund the bundler address
    try {
      const addy = await blockweave.wallets.jwkToAddress(wallet);

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

      console.log(clc.cyan(`Bundler funded with ${amount.toString()} AR, transaction ID: ${tx.id}`));
    } catch (e) {
      clc.red('Error funding bundler address, see more info with the --debug option.');
      if (debug) console.log(e);
    }
  },
};

export default command;
