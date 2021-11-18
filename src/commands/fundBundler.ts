import clc from 'cli-color';
import ArgumentsInterface from '../faces/arguments';
import { getWallet } from '../utils/wallet';
import CommandInterface from '../faces/command';
import walletOption from '../options/wallet';
import debugOption from '../options/debug';
import helpOption from '../options/help';
import timeoutOption from '../options/timeout';
import { JWKInterface } from 'blockweave/dist/faces/lib/wallet';

const command: CommandInterface = {
  name: 'fund-bundler',
  description: 'Fund your bundler account',
  options: [walletOption, debugOption, helpOption, timeoutOption],
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
          quantity: amount.toString(),
        },
        wallet,
      );

      tx.reward = parseInt(tx.reward, 10).toString();
      await blockweave.transactions.sign(tx, wallet);
      await blockweave.transactions.post(tx);

      const url = `https://arweave.net/${tx.id}`;

      console.log(
        `${clc.cyan(addy)} bundler has been funded with ${clc.yellow(
          `AR ${blockweave.ar.winstonToAr(amount.toString(), { formatted: true, decimals: 12, trim: true })}`,
        )}`,
      );

      console.log(clc.green(url));
    } catch (e) {
      clc.red('Error funding bundler address, see more info with the --debug option.');
      if (debug) console.log(e);
    }
  },
};

export default command;
