import { join } from 'path';
import ArgumentsInterface from '../faces/arguments';
import CommandInterface from '../faces/command';

const command: CommandInterface = {
  name: 'version',
  aliases: ['v'],
  description: 'Show the current arkb version number',
  useOptions: false,
  args: [],
  execute: async (_: ArgumentsInterface): Promise<void> => {
    const version = require(join('..', '..', 'package.json')).version;
    console.log(`v${version}`);
  }
};

export default command;