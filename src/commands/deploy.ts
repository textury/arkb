import fs from 'fs';
import path from 'path';
import clc from 'cli-color';
import fg from 'fast-glob';
import Deploy from '../lib/deploy';
import cliQuestions from '../utils/cli-questions';
import IPFS from '../utils/ipfs';
import { globSource } from 'ipfs-http-client';
import last from 'it-last';
import { getWallet } from '../utils/wallet';
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
import bundleOption from '../options/bundle';
import concurrencyOption from '../options/concurrency';
import { JWKInterface } from 'blockweave/dist/faces/lib/wallet';
import { getDeployPath } from '../utils/deploy';

const command: CommandInterface = {
  name: 'deploy',
  aliases: ['d'],
  description: 'Deploy a directory or file',
  options: [
    gatewayOption,
    useBundlerOption,
    bundleOption,
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
      bundle,
      bundler,
    } = args;

    // Get the wallet
    const wallet: JWKInterface = await getWallet(walletPath, config, debug);
    if (!wallet) {
      console.log(clc.red('Please save a wallet or run with the --wallet option.'));
      return;
    }

    if (useBundler && bundle) {
      console.log(clc.red('You can not use a bundler and locally bundle at the same time'));
      return;
    }

    const concurrency = argv.concurrency || 5;
    const forceRedeploy = argv.force;

    // Check and get the specified directory or file
    const dir = getDeployPath(commandValues);

    let files = [dir];
    let isFile = true;
    if (fs.lstatSync(dir).isDirectory()) {
      files = await fg([`${dir}/**/*`], { dot: false });
      isFile = false;
    }

    const deploy = new Deploy(wallet, blockweave, debug, concurrency, true, bundle);

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
      {
        tx: deploy.getBundledTx(),
        bundle: deploy.getBundle(),
      },
    );

    if (balAfter < 0) {
      console.log(
        useBundler
          ? clc.red("You don't have enough bundler balance for this deploy.")
          : clc.red("You don't have enough balance for this deploy."),
      );
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
      let ipf;
      let ipfsHash: string;
      const buffer = [];
      let buf: Buffer;
      try {
        ipf = await last(globSource(dir, { recursive: true }));

        ipf.content.on('data', (chunk) => {
          buffer.push(chunk);
        });

        ipf.content.on('end', async () => {
          buf = Buffer.concat(buffer);
          // Generate the ipfs cid
          ipfsHash = await ipfs.hash(buf);
          console.log('');
          console.log(clc.green('IPFS deployed! Main CID:'));

          console.log(clc.cyan(ipfsHash));
        });
      } catch (e) {
        console.log(e);
      }
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
