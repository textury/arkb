import clc from 'cli-color';
import minimist from 'minimist';
import { cliBalance } from './balance';
import { cliHelp } from './help';
import { cliNetwork } from './network';
import { cliStatus } from './status';
import { cliWalletSave, cliWalletExport, cliWalletForget } from './wallet';
import Tags from '../lib/tags';
import { cliVersion } from './version';
import Arweave from 'arweave';
import Conf from 'conf';
import { cliDeploy } from './deploy';

export async function cliTask(argv: minimist.ParsedArgs, arweave: Arweave, config: Conf, debug: boolean) {
  const command = argv._[0];
  const cvalue = argv._[1];

  const tags = new Tags();
  const tag = argv.tag;
  if (tag) {
    for (const name of Object.keys(tag)) {
      tags.addTag(name, tag[name].toString());
    }
  }

  let feeMultiplier = 1;
  if (argv['fee-multiplier']) {
    try {
      const feeArgv = parseFloat(argv['fee-multiplier']);
      if (feeArgv > 1) {
        feeMultiplier = feeArgv;
      }
      // tslint:disable-next-line: no-empty
    } catch {}
  }

  const useBundler = argv['use-bundler'];
  if (useBundler && feeMultiplier) {
    console.log(clc.yellow('\nWarning: Fee multiplier is ignored when using the bundler'));
  }

  switch (command) {
    case 'deploy':
      cliDeploy(
        cvalue,
        argv.wallet,
        argv.index,
        argv['ipfs-publish'],
        argv['auto-confirm'],
        tags,
        arweave,
        config,
        debug,
        argv['use-bundler'],
        feeMultiplier,
      );
      break;
    case 'status':
      await cliStatus(cvalue, arweave, debug);
      break;
    case 'balance':
      await cliBalance(cvalue, arweave, config, debug);
      break;
    case 'network':
      await cliNetwork(arweave, debug);
      break;
    case 'wallet-save':
      await cliWalletSave(cvalue, config, debug);
      break;
    case 'wallet-export':
      await cliWalletExport(arweave, config, debug);
      break;
    case 'wallet-forget':
      cliWalletForget(config, debug);
      break;
    case 'version':
    case 'v':
      cliVersion();
      break;
    default:
      cliHelp();
      break;
  }
}
