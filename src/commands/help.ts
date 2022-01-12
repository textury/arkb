import clc from 'cli-color';
import clear from 'clear';
import figlet from 'figlet';
import path from 'path';
import CLI from 'clui';
import ArgumentsInterface from '../faces/arguments';
import noColorsOption from '../options/noColors';
import CommandInterface from '../faces/command';
import { parseColor } from '../utils/utils';

const command: CommandInterface = {
  name: 'help',
  aliases: ['h'],
  description: 'Show usage help for a command',
  options: [noColorsOption],
  execute: async (args: ArgumentsInterface): Promise<void> => {
    clear();

    const { commands, options, colors } = args;

    console.log(parseColor(colors, figlet.textSync('ARKB', 'Whimsy'), 'yellow'));
    console.log(`Usage: arkb ${parseColor(colors, '[options]', 'cyan')} ${parseColor(colors, '[command]', 'green')}\n`);

    const Line = CLI.Line;
    new Line().column('Options', 40, colors !== false ? [clc.cyan] : undefined).column('Description', 20, colors !== false ? [clc.blackBright] : undefined).fill().output();

    const opts = Array.from(options)
      .filter(([key, opt]) => key !== opt.alias)
      .map(([key, opt]) => {
        const alias = opt.alias ? ` -${opt.alias}` : '';
        const arg = opt.arg ? parseColor(colors, ` <${opt.arg}>`, 'blackBright') : '';
        return [`--${opt.name + alias + arg}`, opt.description];
      });

    for (let i = 0, j = opts.length; i < j; i++) {
      new Line().column(opts[i][0], 40).column(opts[i][1], 50).fill().output();
    }

    const cmds = Array.from(commands)
      .filter(([key, cmd]) => !cmd.aliases || !cmd.aliases.includes(key))
      .map(([key, cmd]) => {
        const aliases = cmd.aliases && cmd.aliases.length > 0 ? ` (${cmd.aliases.join(', ')})` : '';

        let arg = '';
        if (cmd.args && cmd.args.length > 0) {
          for (const a of cmd.args) {
            arg += parseColor(colors, ` <${a}>`, 'blackBright');
          }
        }

        return [cmd.name + aliases + arg, cmd.description];
      });

    console.log('');

    new Line().column('Commands (alias)', 40, colors !== false ? [clc.green] : undefined).column('Description', 20, colors !== false ? [clc.blackBright] : undefined).fill().output();

    for (let i = 0, j = cmds.length; i < j; i++) {
      new Line().column(cmds[i][0], 40).column(cmds[i][1], 60).fill().output();
    }

    console.log(parseColor(colors, '\nExamples', 'magenta'));
    console.log('Without a saved wallet:');
    console.log(
      `  arkb deploy folder${path.sep}path${path.sep} --wallet path${path.sep}to${path.sep}my${path.sep}wallet.json`,
    );

    console.log('\nSaving a wallet:');
    console.log(`  arkb wallet-save path${path.sep}to${path.sep}wallet.json`);
    console.log(`  arkb deploy folder${path.sep}path`);

    console.log('\nCustom index file:');
    console.log(`  arkb deploy folder${path.sep}path --index custom.html`);

    console.log('\nUsing Bundles:');
    console.log('  arkb deploy folder --use-bundler https://node1.bundlr.network');
  },
};

export default command;
