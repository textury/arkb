import ArgumentsInterface from '../faces/arguments';
import CommandInterface from '../faces/command';
import { getWallet } from '../utils/wallet';
import gatewayOption from '../options/gateway';
import timeoutOption from '../options/timeout';
import walletOption from '../options/wallet';
import debugOption from '../options/debug';
import helpOption from '../options/help';
import noColorsOption from '../options/noColors';
import { isValidWalletAddress, parseColor } from '../utils/utils';
import Transfer from '../lib/transfer';
import { JWKInterface } from 'blockweave/dist/faces/lib/wallet';

const command: CommandInterface = {
  name: 'transfer',
  description: 'Send funds to an Arweave wallet',
  options: [gatewayOption, timeoutOption, walletOption, debugOption, helpOption, noColorsOption],
  args: ['address', 'amount'],
  usage: ['am2NyCEGnxXBqhUGKL8cAv6wbkGKVtgIcdtv9g9QKG1 0.01'],
  execute: async (args: ArgumentsInterface): Promise<void> => {
    const { commandValues, walletPath, feeMultiplier, blockweave, config, debug, colors } = args;

    try {
      const target = commandValues[0].toString();
      const amount = +commandValues[1];

      // Get the wallet
      const wallet: JWKInterface = await getWallet(walletPath, config, debug, colors);
      if (!wallet) {
        console.log(parseColor(colors, 'Please save a wallet or run with the --wallet option.', 'red'));
        return;
      }

      // Check if the target address is valid
      if (!isValidWalletAddress(target)) {
        console.log(parseColor(colors, 'Invalid target wallet address', 'redBright'));
        return;
      }

      // Check if the amount is a positive number
      if (isNaN(amount) || amount <= 0) {
        console.log(parseColor(colors, 'Invalid amount', 'redBright'));
        return;
      }

      // Check if the wallet has enough balance
      const addy = await blockweave.wallets.jwkToAddress(wallet);
      const bal = await blockweave.wallets.getBalance(addy);
      if (+bal < amount) {
        console.log(parseColor(colors, 'Insufficient balance', 'redBright'));
        return;
      }

      const transfer = new Transfer(wallet, blockweave);
      const txid = await transfer.execute(target, amount.toString(), feeMultiplier);

      console.log(parseColor(colors, `Transfer successful! Transaction ID: ${txid}`, 'greenBright'));
    } catch (error) {
      console.log(parseColor(colors, 'Unable to send funds.', 'redBright'));
      if (debug) console.log(error);
    }
  },
};

export default command;
