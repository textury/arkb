import fs from 'fs';
import path from 'path';
import clc from 'cli-color';
import Tags from './lib/tags';
import CommandInterface from './faces/command';
import ArgumentsInterface from './faces/arguments';

export default class CliCommands {
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
  }

  async cliTask(partialArgs: Partial<ArgumentsInterface>) {
    const command = partialArgs.argv._[0];
    const commandValue = partialArgs.argv._[1];

    if (!command) {
      return this.commands.get('help').execute(null);
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
      commandValue,
      tags,
      feeMultiplier,
      useBundler,
      index: partialArgs.argv.index,
      autoConfirm: partialArgs.argv['auto-confirm'],
      ipfsPublish: partialArgs.argv['ipfs-publish'],
    };

    if (this.commands.has(command)) {
      const commandObj = this.commands.get(command);
      if (commandObj && typeof commandObj.execute === 'function') {
        await commandObj.execute(args);
      }
    } else {
      console.log(clc.red(`\nCommand not found: ${command}`));
    }
  }

  private addAliases(comm: CommandInterface) {
    if (comm.aliases && comm.aliases.length > 0) {
      for (const alias of comm.aliases) {
        this.commands.set(alias, comm);
      }
    }
  }
}
