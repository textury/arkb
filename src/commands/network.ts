import { debug } from 'console';
import ArgumentsInterface from '../faces/arguments';
import CommandInterface from '../faces/command';
import { numbersForHumans, parseColor, snakeCaseToTitleCase } from '../utils/utils';
import gatewayOption from '../options/gateway';
import timeoutOption from '../options/timeout';
import debugOption from '../options/debug';
import helpOption from '../options/help';
import noColorsOption from '../options/noColors';

const command: CommandInterface = {
  name: 'network',
  aliases: ['n'],
  description: 'Get the current network info',
  options: [gatewayOption, timeoutOption, debugOption, helpOption, noColorsOption],
  execute: async (args: ArgumentsInterface): Promise<void> => {
    const { blockweave, colors } = args;

    try {
      const net = await blockweave.network.getInfo();
      console.log(parseColor(colors, `Network Details for ${blockweave.config.url}\n`, 'green'));
      Object.keys(net).forEach((key) => {
        const value = net[key];
        console.log(
          `${parseColor(colors, snakeCaseToTitleCase(key), 'yellow')}: ${parseColor(
            colors,
            isNaN(value) ? value : numbersForHumans(value),
            'cyan',
          )}`,
        );
      });
    } catch (err) {
      console.log(parseColor(colors, `Unable to reach ${blockweave.config.url} - ${err.message}`, 'red'));
      if (debug) console.log(err);
    }
  },
};

export default command;
