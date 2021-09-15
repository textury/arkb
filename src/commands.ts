import fs from 'fs';
import path from 'path';
import clc from 'cli-color';
import Tags from './lib/tags';
import CommandInterface from './faces/command';
import ArgumentsInterface from './faces/arguments';
import OptionInterface from './faces/option';

export default class CliCommands {
  options: Map<string, OptionInterface> = new Map();
  commands: Map<string, CommandInterface> = new Map();

  constructor() {
    // Commands
    const commandFiles = fs
      .readdirSync(path.join(__dirname, 'commands'))
      .filter((file) => file.endsWith('.js'));

    for (const file of commandFiles) {
      const filePath = path.join(__dirname, 'commands', file);

      const { default: comm } = require(filePath);
      this.commands.set(comm.name, comm);
      this.addAliases(comm);
    }

    // Options
    const optionFiles = fs
      .readdirSync(path.join(__dirname, 'options'))
      .filter((file) => file.endsWith('.js'));

    for (const file of optionFiles) {
      const filePath = path.join(__dirname, 'options', file);

      const { default: opt } = require(filePath);
      this.options.set(opt.name, opt);
    }
  }

  async cliTask(partialArgs: Partial<ArgumentsInterface>) {
    console.log(partialArgs.argv);

    let command = partialArgs.argv._[0];
    const commandValues = partialArgs.argv._.slice(1);

    if (!command) {
      command = 'help';
    }

    const tags = new Tags();
    const tag = partialArgs.argv.tag;

    if (tag) {
      for (const name of Object.keys(tag)) {
        tags.addTag(name, tag[name].toString());
      }
    }


    let feeMultiplier = 1;
    if (partialArgs.argv['fee-multiplier']) {
      try {
        const feeArgv = parseFloat(partialArgs.argv['fee-multiplier']);
        if (feeArgv > 1) {
          feeMultiplier = feeArgv;
        }
        // tslint:disable-next-line: no-empty
      } catch { }
    }

    const useBundler = partialArgs.argv['use-bundler'];
    if (useBundler && feeMultiplier > 1) {
      console.log(clc.yellow('\nFee multiplier is ignored when using the bundler'));
      feeMultiplier = 1;
    }

    const args: ArgumentsInterface = {
      argv: partialArgs.argv,
      arweave: partialArgs.arweave,
      debug: partialArgs.debug,
      config: partialArgs.config,
      wallet: partialArgs.argv.wallet,
      command,
      commandValues,
      tags,
      feeMultiplier,
      useBundler,
      index: partialArgs.argv.index,
      autoConfirm: partialArgs.argv['auto-confirm'],
      ipfsPublish: partialArgs.argv['ipfs-publish'],
      commands: this.commands,
      options: this.options,
    };

    if (this.commands.has(command)) {
      const commandObj = this.commands.get(command);
      if (commandObj && typeof commandObj.execute === 'function' && !this.showHelp(commandObj, command, args)) {
        await commandObj.execute(args);
      }
    } else {
      console.log(clc.red(`\nCommand not found: ${command}`));
    }
  }

  private addAliases(commOrOpt: CommandInterface | OptionInterface) {
    if ((commOrOpt as CommandInterface).aliases && (commOrOpt as CommandInterface).aliases.length > 0) {
      for (const alias of (commOrOpt as CommandInterface).aliases) {
        this.commands.set(alias, (commOrOpt as CommandInterface));
      }
    } else if ((commOrOpt as OptionInterface).alias) {
      this.options.set((commOrOpt as OptionInterface).alias, (commOrOpt as OptionInterface));
    }
  }

  private showHelp(commandObj: CommandInterface, command: string, partialArgs: Partial<ArgumentsInterface>): boolean {
    if (commandObj.name === 'help' || (!partialArgs.argv.help && !partialArgs.argv.h)) {
      return false;
    }

    console.log(clc.bold(`\nExample usage of ${clc.green(command)}:\n`));
    for (const option of commandObj.options) {
      const usage = commandObj.usage && commandObj.usage.length > 0 ? ` ${commandObj.usage[Math.floor(Math.random() * commandObj.usage.length)]}` : '';
      console.log(`${clc.blackBright(`${option.description}:`)}
arkb ${command + usage} --${option.name}${option.arg ? `=${option.usage}` : ''}\n`);
    }

    return true;
  }
}
