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

const command: CommandInterface = {
  name: 'deploy',
  aliases: [''],
  description: 'Deploy a directory or file',
  useOptions: true,
  args: ['folder/or.file'],
  execute: async (args: ArgumentsInterface): Promise<void> => {
    const { commandValue, wallet: walletPath, config, debug, arweave, tags, ipfsPublish, useBundler, feeMultiplier, autoConfirm } = args;

    const dir = path.join(getUserDirectory(), commandValue);

    // Check if deploy dir exists
    if (!dirExists(dir)) {
      console.log(clc.red("Directory doesn't exist"));
      process.exit(0);
    }

    // Get the wallet
    const wallet: JWKInterface = await getWallet(walletPath, config, debug);

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
      process.exit(0);
    }

    // Check if auto-confirm is added
    let res = { confirm: !!autoConfirm };
    if (!autoConfirm) {
      res = await cliQuestions.showConfirm();
    }
    if (!res.confirm) {
      console.log(clc.red('Rejected!'));
      process.exit(0);
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
        `${arweave.api.getConfig().protocol}://${arweave.api.getConfig().host}:${arweave.api.getConfig().port
        }/${manifestTx}`,
      ),
    );
  }
};

export default command;
