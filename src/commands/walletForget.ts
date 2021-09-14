import fs from 'fs';
import clc from 'cli-color';
import cliQuestions from '../utils/cli-questions';
import Crypter from '../utils/crypter';
import CommandInterface from '../faces/command';
import ArgumentsInterface from '../faces/arguments';

const command: CommandInterface = {
  name: 'wallet-forget',
  aliases: ['wf'],
  description: `Removes a previously saved wallet`,
  useOptions: false,
  args: [],
  execute: async (args: ArgumentsInterface): Promise<void> => {
    const { config, debug } = args;

    try {
      config.delete('wallet');
    } catch (e) {
      console.log(clc.red('Unable to forget the wallet.'));
      if (debug) console.log(e);
    }
  }
};

export default command;