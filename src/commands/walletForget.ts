import CommandInterface from '../faces/command';
import ArgumentsInterface from '../faces/arguments';
import noColorsOption from '../options/noColors';
import { parseColor } from '../utils/utils';

const command: CommandInterface = {
  name: 'wallet-forget',
  aliases: ['wf'],
  options: [noColorsOption],
  description: `Removes a previously saved wallet`,
  execute: async (args: ArgumentsInterface): Promise<void> => {
    const { config, debug, colors } = args;

    try {
      config.delete('wallet');
    } catch (e) {
      console.log(parseColor(colors, 'Unable to forget the wallet.', 'red'));
      if (debug) console.log(e);
    }
  },
};

export default command;
