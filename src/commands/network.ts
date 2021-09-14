import Arweave from 'arweave';
import clc from 'cli-color';
import { debug } from 'console';
import ArgumentsInterface from '../faces/arguments';
import CommandInterface from '../faces/command';
import { getArweaveUri, numbersForHumans, snakeCaseToTitleCase } from '../utils/utils';

const command: CommandInterface = {
  name: 'network',
  aliases: ['net'],
  description: 'Get the current network info',
  useOptions: true,
  args: [],
  execute: async (args: ArgumentsInterface): Promise<void> => {
    const { arweave } = args;

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
  }
};

export default command;
