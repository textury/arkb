import clc from 'cli-color';
import { deepHash } from 'arbundles';
import ArgumentsInterface from '../faces/arguments';
import CommandInterface from '../faces/command';
import { getWallet } from '../utils/wallet';
import walletOption from '../options/wallet';
import amountOption from '../options/amount';
import debugOption from '../options/debug';
import helpOption from '../options/help';
import timeoutOption from '../options/timeout';
import { JWKInterface } from 'blockweave/dist/faces/lib/wallet';
import { stringToBuffer } from 'blockweave/dist/utils/buffer';
import { BundlerWithdraw } from '../faces/bundler';

const command: CommandInterface = {
  name: 'withdraw-bundler',
  aliases: ['wb'],
  description: 'Withdraw from your bundler balance',
  options: [walletOption, debugOption, helpOption, timeoutOption, amountOption],
  execute: async (args: ArgumentsInterface): Promise<void> => {
    const { walletPath, bundler, debug, config, blockweave, commandValues, argv } = args;

    const amount = argv.amount;

    // Check if we have received a command value
    if (!commandValues || !commandValues.length) {
      console.log(clc.red('You forgot to set the bundler network.'));
      return;
    }

    const wallet: JWKInterface = await getWallet(walletPath, config, debug);

    if (!wallet) {
      console.log(clc.red('Please set a wallet or run with the --wallet option.'));
      return;
    }

    if (!amount) {
      console.log(clc.red('Please set an amount, with the --amount option.'));
      return;
    }

    // Get nonce
    let nonce: number;
    let addy: string;
    try {
      addy = await blockweave.wallets.jwkToAddress(wallet);
      const response = await bundler.get(`/account/withdrawals?address=${addy}`);

      nonce = response.data as number;
      if (!response) {
        console.log(clc.red('Error fetching nonce'));
        return;
      }
    } catch (e) {
      console.log(clc.red('Error fetching nonce'));
      if (debug) console.log(e);
      return;
    }

    // Initiate the withdrawal
    try {
      const publicKey: string = wallet.n;

      const data: BundlerWithdraw = {
        publicKey,
        currency: 'arweave',
        amount,
        nonce,
        signature: undefined,
      };

      const hash = await deepHash([
        stringToBuffer(data.currency),
        stringToBuffer(data.amount.toString()),
        stringToBuffer(data.nonce.toString()),
      ]);
      data.signature = await blockweave.crypto.sign(wallet, hash);

      await bundler.post('/account/withdraw', data);

      // Success response
      console.log(
        `${clc.cyan(addy)} has been funded with ${clc.yellow(
          `AR ${blockweave.ar.winstonToAr(amount.toString(), {
            formatted: true,
            decimals: 12,
            trim: true,
          })} from bundler.`,
        )}`,
      );
    } catch (e) {
      console.log(clc.red('Error withdrawing to wallet'));
      if (debug) console.log(e);
      return;
    }
  },
};

export default command;
