import clc from 'cli-color';
import ArgumentsInterface from '../faces/arguments';
import CommandInterface from '../faces/command';
import { getWallet } from '../utils/wallet';
import gatewayOption from '../options/gateway';
import timeoutOption from '../options/timeout';
import walletOption from '../options/wallet';
import debugOption from '../options/debug';
import helpOption from '../options/help';
import { isValidWalletAddress } from '../utils/utils';
import Transfer from '../lib/transfer';
import { JWKInterface } from 'blockweave/dist/faces/lib/wallet';

const command: CommandInterface = {
  name: 'transfer',
  description: 'Send funds to an Arweave wallet',
  options: [gatewayOption, timeoutOption, walletOption, debugOption, helpOption],
  args: ['address', 'amount'],
  usage: ['am2NyCEGnxXBqhUGKL8cAv6wbkGKVtgIcdtv9g9QKG1 0.01'],
  execute: async (args: ArgumentsInterface): Promise<void> => {
    const { commandValues, walletPath, feeMultiplier, blockweave, config, debug } = args;

    try {
      const target = commandValues[0].toString();
      const amount = +commandValues[1];

      // Get the wallet
      const wallet: JWKInterface = await getWallet(walletPath, config, debug);
      if (!wallet) {
        console.log(clc.red('Please save a wallet or run with the --wallet option.'));
        return;
      }

      // Check if the target address is valid
      if (!isValidWalletAddress(target)) {
        console.log(clc.redBright('Invalid target wallet address'));
        return;
      }

      // Check if the amount is a positive number
      if (isNaN(amount) || amount <= 0) {
        console.log(clc.redBright('Invalid amount'));
        return;
      }

      // Check if the wallet has enough balance
      const addy = await blockweave.wallets.jwkToAddress(wallet);
      const bal = await blockweave.wallets.getBalance(addy);
      if (+bal < amount) {
        console.log(clc.redBright('Insufficient balance'));
        return;
      }

      const transfer = new Transfer(wallet, blockweave);
      const txid = await transfer.execute(target, amount.toString(), feeMultiplier);

      console.log(clc.greenBright(`Transfer successful! Transaction ID: ${txid}`));
    } catch (error) {
      console.log(clc.redBright('Unable to send funds.'));
      if (debug) console.log(error);
    }
  },
};

export default command;
