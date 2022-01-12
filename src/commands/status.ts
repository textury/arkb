import ArgumentsInterface from '../faces/arguments';
import CommandInterface from '../faces/command';
import { status } from '../lib/status';
import gatewayOption from '../options/gateway';
import timeoutOption from '../options/timeout';
import debugOption from '../options/debug';
import helpOption from '../options/help';
import noColorsOption from '../options/noColors';
import { parseColor } from '../utils/utils';

const command: CommandInterface = {
  name: 'status',
  aliases: ['s'],
  description: 'Check the status of a transaction ID',
  options: [gatewayOption, timeoutOption, debugOption, helpOption, noColorsOption],
  args: ['txid'],
  usage: ['am2NyCEGnxXBqhUGKL8cAv6wbkGKVtgIcdtv9g9QKG1'],
  execute: async (args: ArgumentsInterface): Promise<void> => {
    const { commandValues, blockweave, debug, colors } = args;

    if (!commandValues || !commandValues.length) {
      console.log(parseColor(colors, 'Error: Missing transaction ID', 'redBright'));
      return;
    }

    const txid = commandValues[0];
    const arweaveUri = blockweave.config.url;

    try {
      const res = await status(txid, blockweave);

      console.log('🚀 ~ file: status.ts ~ line 20 ~ .then ~ res', res);
      let responseStatus = '';
      switch (res.status) {
        case 200:
          responseStatus = parseColor(colors, '200 - Accepted', 'green');
          break;
        case 202:
          responseStatus = parseColor(colors, '202 - Pending', 'yellow');
          break;
        case 400:
          responseStatus = parseColor(colors, `400 - ${res.errorMessage}`, 'red');
          break;
        case 404:
          responseStatus = parseColor(colors, `404 - Not Found`, 'red');
          break;
        default:
          responseStatus = parseColor(colors, `${res.status} - ${res.errorMessage}`, 'red');
          break;
      }
      console.log(`Trasaction ID: ${parseColor(colors, txid, 'blue')}

Status: ${responseStatus}`);

      if (res.status === 200) {
        console.log(` - Block: ${parseColor(colors, res.blockHeight, 'cyan')}
 - Block hash: ${parseColor(colors, res.blockHash, 'cyan')}
 - Confirmations: ${parseColor(colors, res.confirmations, 'cyan')}

Transaction URL: ${parseColor(colors, `${arweaveUri}/${txid}`, 'cyan')}
Block URL: ${parseColor(colors, `${arweaveUri}/block/hash/${res.blockHash}`, 'cyan')}

Transaction explorer URL: ${parseColor(colors, `https://viewblock.io/arweave/tx/${txid}`, 'cyan')}
Block explorer URL: ${parseColor(colors, `https://viewblock.io/arweave/block/${res.blockHeight}`)}`, 'cyan');
      }
    } catch (e) {
      console.log(parseColor(colors, `Unable to reach ${blockweave.config.url} - ${e.message}`, 'red'));
      if (debug) console.log(e);
    }
  },
};

export default command;
