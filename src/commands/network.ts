import Arweave from 'arweave';
import clc from 'cli-color';
import { getArweaveUri, numbersForHumans, snakeCaseToTitleCase } from '../utils/utils';

export async function cliNetwork(arweave: Arweave, debug: boolean): Promise<void> {
  try {
    const net = await arweave.network.getInfo();
    Object.keys(net).forEach((key) => {
      const value = net[key];
      console.log(`${snakeCaseToTitleCase(key)}: ${clc.cyan(isNaN(value) ? value : numbersForHumans(value))}`);
    });
  } catch (err) {
    console.log(clc.red(`Unable to reach ${getArweaveUri(arweave)} - ${err.message}`));
    if (debug) console.log(err);
  }

  process.exit(0);
}
