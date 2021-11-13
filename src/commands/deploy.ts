import fs from 'fs';
import path from 'path';
import clc from 'cli-color';
import fg from 'fast-glob';
import normalize from 'normalize-path';
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
import licenseOption from '../options/license';
import autoConfirmOption from '../options/autoConfirm';
import feeMultiplierOption from '../options/feeMultiplier';
import timeoutOption from '../options/timeout';
import tagNameOption from '../options/tagName';
import tagValueOption from '../options/tagValue';
import walletOption from '../options/wallet';
import debugOption from '../options/debug';
import helpOption from '../options/help';
import forceOption from '../options/force';
import concurrencyOption from '../options/concurrency';
import { JWKInterface } from 'blockweave/dist/faces/lib/wallet';

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
    licenseOption,
    walletOption,
    ipfsPublishOption,
    autoConfirmOption,
    timeoutOption,
    concurrencyOption,
    forceOption,
    debugOption,
    helpOption,
  ],
  args: ['folder_or_file'],
  usage: [`folder${path.sep}filename.json`, `.${path.sep}folder`],
  execute: async (args: ArgumentsInterface): Promise<void> => {
    const {
      argv,
      commandValues,
      walletPath,
      config,
      debug,
      blockweave,
      tags,
      ipfsPublish,
      license,
      useBundler,
      feeMultiplier,
      autoConfirm,
      bundler
    } = args;

    const concurrency = argv.concurrency || 5;
    const forceRedeploy = argv.force;

    // Check if we have received a command value
    if (!commandValues || !commandValues.length) {
      console.log(clc.red('You forgot to set the directory or file that you want to deploy.'));
      return;
    }

    const commandValue = commandValues[0];
    let dir = path.join(getUserDirectory(), commandValue.replace(/[\/\\]$/, ''));
    // Normalize for os differences
    dir = normalize(dir);

    // Check if deploy dir exists
    if (!dirExists(dir)) {
      dir = commandValue.replace(/[\/\\]$/, '');
      if (!dirExists(dir)) {
        console.log(clc.red(`The directory or file does not exist.`));
        return;
      }
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

    const deploy = new Deploy(wallet, blockweave, debug, concurrency);

    if (!args.index) {
      args.index = 'index.html';
    }

    const txs = await deploy.prepare(
      dir,
      files,
      args.index,
      tags,
      ipfsPublish,
      license,
      useBundler,
      feeMultiplier,
      forceRedeploy,
    );
    const balAfter = await showDeployDetails(
      txs,
      wallet,
      isFile,
      dir,
      blockweave,
      useBundler,
      deploy.getBundler(),
      license,
      bundler,
    );

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
    console.log(clc.cyan(`${blockweave.config.url}/${manifestTx}`));
  },
};

export default command;
