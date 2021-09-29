import clc from 'cli-color';
import { debug } from 'console';
import ArgumentsInterface from '../faces/arguments';
import CommandInterface from '../faces/command';
import { getArweaveUri, numbersForHumans, snakeCaseToTitleCase } from '../utils/utils';
import gatewayOption from '../options/gateway';
import timeoutOption from '../options/timeout';
import debugOption from '../options/debug';
import helpOption from '../options/help';

const command: CommandInterface = {
  name: 'network',
  aliases: ['n'],
  description: 'Get the current network info',
  options: [gatewayOption, timeoutOption, debugOption, helpOption],
  execute: async (args: ArgumentsInterface): Promise<void> => {
    const { blockweave } = args;

    try {
      const net = await blockweave.network.getInfo();
      console.log(clc.green(`Network Details for ${getArweaveUri(blockweave)}\n`));
      Object.keys(net).forEach((key) => {
        const value = net[key];
        console.log(
          `${clc.yellow(snakeCaseToTitleCase(key))}: ${clc.cyan(isNaN(value) ? value : numbersForHumans(value))}`,
        );
      });
    } catch (err) {
      console.log(clc.red(`Unable to reach ${getArweaveUri(blockweave)} - ${err.message}`));
      if (debug) console.log(err);
    }
  },
};

export default command;
