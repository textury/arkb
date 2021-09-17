import clc from 'cli-color';
import ArgumentsInterface from '../faces/arguments';
import CommandInterface from '../faces/command';
import { status } from '../lib/status';
import { getArweaveUri } from '../utils/utils';
import gatewayOption from '../options/gateway';
import timeoutOption from '../options/timeout';
import debugOption from '../options/debug';
import helpOption from '../options/help';

const command: CommandInterface = {
  name: 'status',
  aliases: ['s'],
  description: 'Check the status of a transaction ID',
  options: [gatewayOption, timeoutOption, debugOption, helpOption],
  args: ['txid'],
  usage: ['am2NyCEGnxXBqhUGKL8cAv6wbkGKVtgIcdtv9g9QKG1'],
  execute: async (args: ArgumentsInterface): Promise<void> => {
    const { commandValues, arweave, debug } = args;

    if (!commandValues || !commandValues.length) {
      console.log(clc.redBright('Error: Missing transaction ID'));
      return;
    }

    const txid = commandValues[0];
    const arweaveUri = getArweaveUri(arweave);

    try {
      const res = await status(txid, arweave);

      console.log('🚀 ~ file: status.ts ~ line 20 ~ .then ~ res', res);
      let responseStatus = '';
      switch (res.status) {
        case 200:
          responseStatus = clc.green('200 - Accepted');
          break;
        case 202:
          responseStatus = clc.yellow('202 - Pending');
          break;
        case 400:
          responseStatus = clc.red(`400 - ${res.errorMessage}`);
          break;
        case 404:
          responseStatus = clc.red(`404 - Not Found`);
          break;
        default:
          responseStatus = clc.red(`${res.status} - ${res.errorMessage}`);
          break;
      }
      console.log(`Trasaction ID: ${clc.blue(txid)}

Status: ${responseStatus}`);

      if (res.status === 200) {
        console.log(` - Block: ${clc.cyan(res.blockHeight)}
 - Block hash: ${clc.cyan(res.blockHash)}
 - Confirmations: ${clc.cyan(res.confirmations)}

Transaction URL: ${clc.cyan(`${arweaveUri}/${txid}`)}
Block URL: ${clc.cyan(`${arweaveUri}/block/hash/${res.blockHash}`)}

Transaction explorer URL: ${clc.cyan(`https://viewblock.io/arweave/tx/${txid}`)}
Block explorer URL: ${clc.cyan(`https://viewblock.io/arweave/block/${res.blockHeight}`)}`);
      }
    } catch (e) {
      console.log(clc.red(`Unable to reach ${getArweaveUri(arweave)} - ${e.message}`));
      if (debug) console.log(e);
    }
  },
};

export default command;
