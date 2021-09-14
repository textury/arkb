import fs from 'fs';
import Arweave from 'arweave';
import { JWKInterface } from 'arweave/node/lib/wallet';
import clc from 'cli-color';
import fg from 'fast-glob';
import Deploy from '../lib/deploy';
import Tags from '../lib/tags';
import cliQuestions from '../utils/cli-questions';
import IPFS from '../utils/ipfs';
import { getWallet } from '../utils/wallet';
import { dirExists } from '../utils/utils';
import { showDeployDetails } from '../utils/showDeployDetails';
import Conf from 'conf';

export async function cliDeploy(
  dir: string,
  walletPath: string,
  index: string,
  toIpfs: boolean = false,
  confirm: boolean = false,
  tags: Tags = new Tags(),
  arweave: Arweave,
  config: Conf,
  debug: boolean,
  useBundler?: string,
  feeMultiplier: number = 1,
) {
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

  if (!index) {
    index = 'index.html';
  }

  const txs = await deploy.prepare(dir, files, index, tags, toIpfs, useBundler, feeMultiplier);
  const balAfter = await showDeployDetails(txs, wallet, isFile, dir, arweave, useBundler, deploy.getBundler());

  if (balAfter < 0) {
    console.log(clc.red("You don't have enough balance for this deploy."));
    process.exit(0);
  }

  // Check if auto-confirm is added
  let res = { confirm: false };
  if (confirm) {
    res.confirm = true;
  } else {
    res = await cliQuestions.showConfirm();
  }
  if (!res.confirm) {
    console.log(clc.red('Rejected!'));
    process.exit(0);
  }

  if (toIpfs) {
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

  process.exit(0);
}
