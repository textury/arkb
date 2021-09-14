import clc from 'cli-color';
import clear from 'clear';
import figlet from 'figlet';
import path from 'path';
import CLI from 'clui';

export function cliHelp() {
  clear();
  console.log(clc.yellow(figlet.textSync('ARKB', 'Whimsy')));
  console.log(`Usage: arkb ${clc.cyan('[options]')} ${clc.green('[command]')}\n`);

  const Line = CLI.Line;
  new Line().column('Options', 40, [clc.cyan]).column('Description', 20, [clc.blackBright]).fill().output();

  const opts = [
    ['-v --version', 'Show the version number'],
    ['--host <host_or_ip>', 'Set the network hostname or ip'],
    ['--protocol <protocol>', 'Set the network protocol (http or https)'],
    ['--port <port>', 'Set the network port'],
    ['--ipfs-publish', 'Publish with Arweave+IPFS'],
    ['--use-bundler <host>', 'Use ans104 and bundler host'],
    ['--auto-confirm', 'Skips the confirm screen'],
    ['--fee-multiplier 1', 'Set the fee multiplier for all transactions'],
    ['--timeout <timeout>', 'Set the request timeout'],
    ['--tag.Tag-Name=tagvalue', 'Set tags to your files'],
    ['--wallet <wallet_file_path>', 'Set the key file path'],
    ['--debug', 'Display additional logging'],
    ['-h --help', 'Display this message'],
  ];

  for (let i = 0, j = opts.length; i < j; i++) {
    new Line().column(opts[i][0], 40).column(opts[i][1], 50).fill().output();
  }

  const cmds = [
    [`deploy <dir_path> ${clc.cyan('[options]')}`, 'Deploy a directory'],
    ['status <tx_id>', 'Check the status of a transaction ID'],
    ['balance', 'Get the current balance of your wallet'],
    ['network', 'Get the current network info'],
    ['wallet-save <wallet_file_path>', 'Save a wallet to remove the need for the --wallet option'],
    ['wallet-export', 'Decrypt and export the saved wallet file'],
    ['wallet-forget', 'Forget your saved wallet file'],
  ];

  console.log('');

  new Line().column('Commands', 40, [clc.green]).column('Description', 20, [clc.blackBright]).fill().output();

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

  process.exit(0);
}
