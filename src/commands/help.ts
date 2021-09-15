import clc from 'cli-color';
import clear from 'clear';
import figlet from 'figlet';
import path from 'path';
import CLI from 'clui';
import ArgumentsInterface from '../faces/arguments';
import CommandInterface from '../faces/command';

const command: CommandInterface = {
  name: 'help',
  aliases: ['h'],
  description: 'Deploy a directory or file',
  execute: async (args: ArgumentsInterface): Promise<void> => {
    clear();

    const { commands, options } = args;

    console.log(clc.yellow(figlet.textSync('ARKB', 'Whimsy')));
    console.log(`Usage: arkb ${clc.cyan('[options]')} ${clc.green('[command]')}\n`);

    const Line = CLI.Line;
    new Line().column('Options', 40, [clc.cyan]).column('Description', 20, [clc.blackBright]).fill().output();

    const opts = Array.from(options)
      .filter(([key, opt]) => key !== opt.alias)
      .map(([key, opt]) => {
        const alias = opt.alias ? ` -${opt.alias}` : '';
        const arg = opt.arg ? clc.blackBright(` <${opt.arg}>`) : '';
        return [
          `--${opt.name + alias + arg}`,
          opt.description,
        ];
      });

    // const opts = [
    //   [`--gateway ${clc.blackBright('<host_or_ip>')}`, 'Set the gateway hostname or ip'],
    //   [`--use-bundler ${clc.blackBright('<host_or_ip>')}`, 'Use ans104 and bundler host'],
    //   [`--fee-multiplier ${clc.blackBright('<number>')}`, 'Set the fee multiplier for all transactions'],
    //   [`--timeout ${clc.blackBright('<timeout>')}`, 'Set the request timeout'],
    //   [`--wallet ${clc.blackBright('<wallet_path>')}`, 'Set the key file path'],
    //   [`--tag.Tag-Name=tagvalue`, 'Set tags to your files'],
    //   ['--ipfs-publish', 'Publish with Arweave+IPFS'],
    //   ['--auto-confirm', 'Skips the confirm screen'],
    //   ['--debug', 'Display additional logging'],
    //   ['-h --help', 'Display this message'],
    // ];

    for (let i = 0, j = opts.length; i < j; i++) {
      new Line().column(opts[i][0], 40).column(opts[i][1], 50).fill().output();
    }

    const cmds = Array.from(commands)
      .filter(([key, cmd]) => !cmd.aliases.includes(key))
      .map(([key, cmd]) => {
        const aliases = cmd.aliases && cmd.aliases.length > 0 ? ` (${cmd.aliases.join(', ')})` : '';
        const arg = cmd.arg && cmd.arg.length > 0 ? clc.blackBright(` <${cmd.arg}>`) : '';
        const opt = cmd.options && cmd.options.length > 0 ? ' [options]' : '';
        return [
          cmd.name + aliases + arg + opt,
          cmd.description
        ];
      });

    console.log('');

    new Line().column('Commands (alias)', 40, [clc.green]).column('Description', 20, [clc.blackBright]).fill().output();

    for (let i = 0, j = cmds.length; i < j; i++) {
      new Line().column(cmds[i][0], 40).column(cmds[i][1], 60).fill().output();
    }

    console.log(clc.magenta('\nExamples'));
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
    console.log('  arkb deploy folder --use-bundler http://bundler.arweave.net:10000');
  }
};

export default command;