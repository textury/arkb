import fs from 'fs';
import path from 'path';
import spdx from 'spdx-license-ids';
import Fuse from 'fuse.js';
import { URL } from 'url';
import Api from 'arweave/node/lib/api';
import Tags from './lib/tags';
import CommandInterface from './faces/command';
import ArgumentsInterface from './faces/arguments';
import OptionInterface from './faces/option';
import { parseColor } from './utils/utils';

export default class CliCommands {
  options: Map<string, OptionInterface> = new Map();
  commands: Map<string, CommandInterface> = new Map();
  bundler: Api;

  constructor() {
    // Commands
    const commandFiles = fs.readdirSync(path.join(__dirname, 'commands')).filter((file) => file.endsWith('.js'));

    for (const file of commandFiles) {
      const filePath = path.join(__dirname, 'commands', file);

      const { default: comm } = require(filePath);
      this.commands.set(comm.name, comm);
      this.addAliases(comm);
    }

    // Options
    const optionFiles = fs.readdirSync(path.join(__dirname, 'options')).filter((file) => file.endsWith('.js'));

    for (const file of optionFiles) {
      const filePath = path.join(__dirname, 'options', file);

      const { default: opt } = require(filePath);
      this.options.set(opt.name, opt);
    }
  }

  async cliTask(partialArgs: Partial<ArgumentsInterface>) {
    let command = partialArgs.argv._[0];
    const commandValues = partialArgs.argv._.slice(1);

    if (!command) {
      command = 'help';
    }

    const tags = new Tags();
    const tagNames = partialArgs.argv['tag-name'];
    const tagValues = partialArgs.argv['tag-value'];

    if (tagNames && tagValues) {
      const isArrayTagNames = Array.isArray(tagNames);
      const isArrayTagValues = Array.isArray(tagValues);

      if (isArrayTagNames && isArrayTagValues) {
        for (let i = 0; i < tagNames.length; i++) {
          const name = tagNames[i]?.toString();
          const value = tagValues[i]?.toString();
          if (name && value) {
            tags.addTag(name, value);
          }
        }
      } else {
        tags.addTag(
          Array.isArray(tagNames) ? tagNames[0].toString() : tagNames.toString(),
          Array.isArray(tagValues) ? tagValues[0].toString() : tagValues.toString(),
        );
      }
    }

    // Get the options aliases and set the option value to the alias value
    for (const option of this.options.values()) {
      if (option.alias) {
        const alias = partialArgs.argv[option.alias];
        if (alias) {
          partialArgs.argv[option.name] = alias;
        }
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
      } catch {}
    }

    let useBundler = partialArgs.argv['use-bundler'];
    const colors = partialArgs.argv.colors;

    if (useBundler) {
      let parsed;
      if (typeof useBundler === 'boolean' && useBundler === true) {
        // reassign useBundler arg for all instances that use it
        partialArgs.argv['use-bundler'] = 'https://node2.bundlr.network';
        useBundler = 'https://node2.bundlr.network';
      }

      try {
        parsed = new URL(useBundler);
      } catch (e) {
        console.log(parseColor(colors, '[--use-bundler] Invalid url format', 'red'));
        if (partialArgs.debug) console.log(e);
        process.exit(1);
      }
      this.bundler = new Api({ ...parsed, host: parsed.hostname });
    }

    if (useBundler && feeMultiplier > 1) {
      console.log(parseColor(colors, '\nFee multiplier is ignored when using the bundler', 'yellow'));
      feeMultiplier = 1;
    }

    let license = '';

    if (partialArgs.argv.license) {
      license = partialArgs.argv.license;
      if (!spdx.includes(license)) {
        // help the user
        const fuse = new Fuse(spdx);
        const spdxCandidates = fuse.search(license);
        console.log(parseColor(colors, `\n"${license}" is not a valid spdx license identifier`, 'red'));
        if (spdxCandidates.length > 0) {
          console.log(parseColor(colors, 'Did you mean?', 'yellow'));
          spdxCandidates.slice(0, 5).map((cand) => console.log(parseColor(colors, ` ${cand.item}`, 'blue')));
        } else {
          console.log(
            parseColor(colors, `A list of valid spdx identifiers can be found at https://spdx.org/licenses/`, 'yellow'),
          );
        }
        process.exit(1);
      }
    }

    const args: ArgumentsInterface = {
      argv: partialArgs.argv,
      blockweave: partialArgs.blockweave,
      debug: partialArgs.debug,
      config: partialArgs.config,
      walletPath: partialArgs.argv.wallet,
      command,
      commandValues,
      tags,
      feeMultiplier,
      useBundler,
      bundle: partialArgs.argv.bundle,
      license,
      index: partialArgs.argv.index,
      autoConfirm: partialArgs.argv['auto-confirm'],
      commands: this.commands,
      options: this.options,
      bundler: this.bundler,
      colors: partialArgs.argv.colors,
    };

    if (this.commands.has(command)) {
      const commandObj = this.commands.get(command);
      if (commandObj && typeof commandObj.execute === 'function' && !this.showHelp(commandObj, command, args)) {
        await commandObj.execute(args);
      }
    } else {
      console.log(parseColor(colors, `\nCommand not found: ${command}`, 'red'));
    }
  }

  private addAliases(commOrOpt: CommandInterface | OptionInterface) {
    if ((commOrOpt as CommandInterface).aliases && (commOrOpt as CommandInterface).aliases.length > 0) {
      for (const alias of (commOrOpt as CommandInterface).aliases) {
        this.commands.set(alias, commOrOpt as CommandInterface);
      }
    } else if ((commOrOpt as OptionInterface).alias) {
      this.options.set((commOrOpt as OptionInterface).alias, commOrOpt as OptionInterface);
    }
  }

  private showHelp(commandObj: CommandInterface, command: string, partialArgs: Partial<ArgumentsInterface>): boolean {
    if (commandObj.name === 'help' || !partialArgs.argv.help) {
      return false;
    }

    const colors = partialArgs.argv.colors;
    console.log(parseColor(colors, `\nExample usage of ${parseColor(colors, command, 'green')}:\n`, 'bold'));
    for (const option of commandObj.options) {
      const usage =
        commandObj.usage && commandObj.usage.length > 0
          ? ` ${commandObj.usage[Math.floor(Math.random() * commandObj.usage.length)]}`
          : '';
      console.log(`${parseColor(colors, `${option.description}:`, 'blackBright')}
arkb ${command + usage} --${option.name}${option.arg ? `=${option.usage}` : ''}\n`);
    }

    return true;
  }
}
