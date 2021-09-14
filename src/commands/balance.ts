import Arweave from 'arweave';
import { JWKInterface } from 'arweave/node/lib/wallet';
import clc from 'cli-color';
import Conf from 'conf';
import { getWallet } from '../utils/wallet';

export async function cliBalance(walletPath: string, arweave: Arweave, config: Conf, debug: boolean): Promise<void> {
  const wallet: JWKInterface = await getWallet(walletPath, config, debug);

  if (!wallet) {
    console.log(clc.red('Please set a wallet or run with the --wallet option.'));
    process.exit(0);
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
