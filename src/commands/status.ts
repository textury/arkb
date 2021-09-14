import Arweave from 'arweave';
import clc from 'cli-color';
import { debug } from 'console';
import ArgumentsInterface from '../faces/arguments';
import CommandInterface from '../faces/command';
import { status } from '../lib/status';
import { getArweaveUri } from '../utils/utils';

const command: CommandInterface = {
  name: 'status',
  aliases: ['stat'],
  description: 'Check the status of a transaction ID',
  useOptions: true,
  args: ['txid'],
  execute: async (args: ArgumentsInterface): Promise<void> => {
    const { commandValue: txid, arweave } = args;

    const arweaveUri = getArweaveUri(arweave);

    status(txid, arweave)
      .then((res) => {
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
          console.log(` - Block: ${res.blockHeight}
 - Block hash: ${res.blockHash}
 - Confirmations: ${res.confirmations}

Transaction URL: ${arweaveUri}/${txid}
Block URL: ${arweaveUri}/block/hash/${res.blockHash}

Transaction explorer URL: https://viewblock.io/arweave/tx/${txid}
Block explorer URL: https://viewblock.io/arweave/block/${res.blockHeight}`);
        }
      })
      .catch((e) => {
        console.log(clc.red(`Unable to reach ${getArweaveUri(arweave)} - ${e.message}`));
        if (debug) console.log(e);
      });
  }
};

export default command;