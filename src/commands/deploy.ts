import fs from 'fs';
import path from 'path';
import { JWKInterface } from 'arweave/node/lib/wallet';
import clc from 'cli-color';
import fg from 'fast-glob';
import Deploy from '../lib/deploy';
import cliQuestions from '../utils/cli-questions';
import IPFS from '../utils/ipfs';
import { getWallet } from '../utils/wallet';
import { dirExists, getUserDirectory } from '../utils/utils';
import { showDeployDetails } from '../utils/showDeployDetails';
import CommandInterface from '../faces/command';
import ArgumentsInterface from '../faces/arguments';
import gatewayOption from '../options/gateway';
import ipfsPublishOption from '../options/ipfsPublish';
import useBundlerOption from '../options/useBundler';
import autoConfirmOption from '../options/autoConfirm';
import feeMultiplierOption from '../options/feeMultiplier';
import timeoutOption from '../options/timeout';
import tagNameOption from '../options/tagName';
import tagValueOption from '../options/tagValue';
import walletOption from '../options/wallet';
import debugOption from '../options/debug';
import helpOption from '../options/help';

const command: CommandInterface = {
  name: 'deploy',
  aliases: ['d'],
  description: 'Deploy a directory or file',
  options: [
    gatewayOption,
    useBundlerOption,
    feeMultiplierOption,
    tagNameOption,
    tagValueOption,
    walletOption,
    ipfsPublishOption,
    autoConfirmOption,
    timeoutOption,
    debugOption,
    helpOption,
  ],
  args: ['folder_or_file'],
  usage: [`folder${path.sep}filename.json`, `.${path.sep}folder`],
  execute: async (args: ArgumentsInterface): Promise<void> => {
    const {
      commandValues,
      walletPath,
      config,
      debug,
      arweave,
      tags,
      ipfsPublish,
      useBundler,
      feeMultiplier,
      autoConfirm,
    } = args;

    // Check if we have received a command value
    if (!commandValues || !commandValues.length) {
      console.log(clc.red('You forgot to set the directory or file that you want to deploy.'));
      return;
    }

    const commandValue = commandValues[0];
    const dir = path.join(getUserDirectory(), commandValue.replace(/[\/\\]$/, ''));

    // Check if deploy dir exists
    if (!dirExists(dir)) {
      console.log(clc.red("Directory doesn't exist."));
      return;
    }

    // Get the wallet
    const wallet: JWKInterface = await getWallet(walletPath, config, debug);
    if (!wallet) {
      console.log(clc.red('Please save a wallet or run with the --wallet option.'));
      return;
    }

    let files = [dir];
    let isFile = true;
    if (fs.lstatSync(dir).isDirectory()) {
      files = await fg([`${dir}/**/*`], { dot: false });
      isFile = false;
    }

    const deploy = new Deploy(wallet, arweave, debug);

    if (!args.index) {
      args.index = 'index.html';
    }

    const txs = await deploy.prepare(dir, files, args.index, tags, ipfsPublish, useBundler, feeMultiplier);
    const balAfter = await showDeployDetails(txs, wallet, isFile, dir, arweave, useBundler, deploy.getBundler());

    if (balAfter < 0) {
      console.log(clc.red("You don't have enough balance for this deploy."));
      return;
    }

    // Check if auto-confirm is added
    let res = { confirm: !!autoConfirm };
    if (!autoConfirm) {
      res = await cliQuestions.showConfirm();
    }
    if (!res.confirm) {
      console.log(clc.red('Rejected!'));
      return;
    }

    if (ipfsPublish) {
      const ipfs = new IPFS();
      const ipfsHash = await ipfs.deploy(dir);

      console.log('');
      console.log(clc.green('IPFS deployed! Main CID:'));

      console.log(clc.cyan(ipfsHash.cid));
    }

    const manifestTx: string = await deploy.deploy(isFile, useBundler);

    console.log('');
    if (useBundler) {
      console.log(clc.green('Data items deployed! Visit the following URL to see your deployed content:'));
    } else {
      console.log(clc.green('Files deployed! Visit the following URL to see your deployed content:'));
    }
    console.log(
      clc.cyan(
        `${arweave.api.getConfig().protocol}://${arweave.api.getConfig().host}:${
          arweave.api.getConfig().port
        }/${manifestTx}`,
      ),
    );
  },
};

export default command;
