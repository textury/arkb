import fs from 'fs';
import path from 'path';
import fg from 'fast-glob';
import Deploy from '../lib/deploy';
import cliQuestions from '../utils/cli-questions';
import { getWallet } from '../utils/wallet';
import { showDeployDetails } from '../utils/showDeployDetails';
import CommandInterface from '../faces/command';
import ArgumentsInterface from '../faces/arguments';
import gatewayOption from '../options/gateway';
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
import noColorsOption from '../options/noColors';
import { JWKInterface } from 'blockweave/dist/faces/lib/wallet';
import { getDeployPath } from '../utils/deploy';
import { parseColor } from '../utils/utils';

const command: CommandInterface = {
  name: 'deploy',
  aliases: ['d', 'upload'],
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
    autoConfirmOption,
    timeoutOption,
    concurrencyOption,
    forceOption,
    debugOption,
    helpOption,
    noColorsOption,
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
      license,
      useBundler,
      feeMultiplier,
      autoConfirm,
      bundle,
      bundler,
      colors,
    } = args;

    // Get the wallet
    let wallet: JWKInterface = await getWallet(walletPath, config, debug, colors);

    if (useBundler && !wallet) {
      wallet = await blockweave.wallets.generate();
    }

    if (!wallet) {
      console.log(parseColor(colors, 'Please save a wallet or run with the --wallet option.', 'red'));
      return;
    }

    if (useBundler && bundle) {
      console.log(parseColor(colors, 'You can not use a bundler and locally bundle at the same time', 'red'));
      return;
    }

    const concurrency = argv.concurrency || 5;
    const forceRedeploy = argv.force;

    // Check and get the specified directory or file
    const dir = getDeployPath(commandValues, colors);

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
      license,
      useBundler,
      feeMultiplier,
      forceRedeploy,
      colors,
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
      colors,
    );

    if (balAfter < 0) {
      console.log(
        useBundler
          ? parseColor(colors, "You don't have enough bundler balance for this deploy.", 'red')
          : parseColor(colors, "You don't have enough balance for this deploy.", 'red'),
      );
      return;
    }

    // Check if auto-confirm is added
    let res = { confirm: !!autoConfirm };
    if (!autoConfirm) {
      res = await cliQuestions.showConfirm();
    }
    if (!res.confirm) {
      console.log(parseColor(colors, 'Rejected!', 'red'));
      return;
    }

    const manifestTx: string = await deploy.deploy(isFile, useBundler, colors);

    console.log('');
    if (useBundler) {
      console.log(
        parseColor(colors, 'Data items deployed! Visit the following URL to see your deployed content:', 'green'),
      );
    } else {
      console.log(parseColor(colors, 'Files deployed! Visit the following URL to see your deployed content:', 'green'));
    }
    console.log(parseColor(colors, `${blockweave.config.url}/${manifestTx}`, 'cyan'));
  },
};

export default command;
