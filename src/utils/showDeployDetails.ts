import CLI from 'clui';
import clc from 'cli-color';
import { FileBundle, FileDataItem } from 'arbundles/file';
import path from 'path';
import { TxDetail } from '../faces/txDetail';
import Bundler from './bundler';
import Blockweave from 'blockweave';
import { bytesForHumans, parseColor } from './utils';
import Transaction from 'blockweave/dist/lib/transaction';
import { JWKInterface } from 'blockweave/dist/faces/lib/wallet';
import Api from 'arweave/node/lib/api';

export async function showDeployDetails(
  txs: TxDetail[],
  wallet: JWKInterface,
  isFile: boolean = false,
  dir: string,
  blockweave: Blockweave,
  useBundler?: string,
  bundler?: Bundler,
  license?: string,
  bundlerApi?: Api,
  bundled?: {
    tx: Transaction;
    bundle: FileBundle;
  },
  colors?: boolean,
): Promise<number> {
  let totalSize = 0;
  let deployFee = 0;

  // check if all files satisfy for free bundler deploy
  // is free bundler deploy variable
  const ifd = !txs.some((tx) => tx.fileSize > 100 * 1000);

  const Line = CLI.Line;
  new Line()
    .column('ID', 45, colors !== false ? [clc.cyan] : undefined)
    .column('Size', 15, colors !== false ? [clc.cyan] : undefined)
    .column('Fee', 17, colors !== false ? [clc.cyan] : undefined)
    .column('Type', 30, colors !== false ? [clc.cyan] : undefined)
    .column('Path', 20, colors !== false ? [clc.cyan] : undefined)
    .fill()
    .output();

  for (let i = 0, j = txs.length; i < j; i++) {
    const tx = txs[i];

    let ar = '-';
    const reward = (tx.tx as Transaction).reward;
    if (reward) {
      ar = blockweave.ar.winstonToAr(reward);
      deployFee += +reward;
    }

    let size = '-';
    const dataSize = tx.fileSize || (tx.tx as Transaction).data_size;
    if (dataSize) {
      size = bytesForHumans(+dataSize);
      totalSize += +dataSize;
    }

    let filePath = tx.filePath;
    if (filePath.startsWith(`${dir}/`)) {
      filePath = filePath.split(`${dir}/`)[1];
    }

    if (!filePath) {
      filePath = '';
    }

    new Line()
      .column(tx.tx.id, 45)
      .column(size, 15)
      .column(ar, 17)
      .column(tx.type, 30)
      .column(filePath, 20)
      .fill()
      .output();
  }

  if (bundled.tx) {
    const size = bundled.tx.data_size;
    totalSize += +size;

    const reward = bundled.tx.reward;
    const ar = blockweave.ar.winstonToAr(reward);
    deployFee += +reward;

    new Line()
      .column(bundled.tx.id, 45)
      .column(bytesForHumans(+size), 15)
      .column(ifd ? '-' : ar, 17)
      .column('Bundle', 30)
      .column('-', 20)
      .fill()
      .output();
  }

  const fee = parseInt((deployFee * 0.1).toString(), 10);

  let arFee = blockweave.ar.winstonToAr(deployFee.toString());
  let serviceFee = blockweave.ar.winstonToAr(fee.toString());
  let totalFee = blockweave.ar.winstonToAr((deployFee + fee).toString());

  if (useBundler && ifd) {
    arFee = '0';
    serviceFee = '0';
    totalFee = '0';
  }

  console.log('');
  console.log(parseColor(colors, 'Summary', 'cyan'));
  if (license) {
    console.log(`License: ${license}`);
  }

  if (useBundler) {
    console.log(`Data items to deploy: ${isFile ? '1' : `${txs.length - 1} + 1 manifest`}`);
  } else if (bundled) {
    console.log(`All items will be deployed in a single bundle`);
  } else {
    console.log(`Files to deploy: ${isFile ? '1' : `${txs.length - 1} + 1 manifest`}`);
  }

  console.log(`Total size: ${bytesForHumans(totalSize)}`);
  console.log(`Fees: ${arFee} + ${serviceFee} (10% arkb fee)`);
  console.log(`Total fee: ${totalFee}`);

  const addy = await blockweave.wallets.jwkToAddress(wallet);
  let winston: string;

  if (useBundler) {
    const balance = await Bundler.getAddressBalance(bundlerApi, addy);
    winston = balance.toString();
  } else {
    winston = await blockweave.wallets.getBalance(addy);
  }

  const bal = blockweave.ar.winstonToAr(winston);
  const balAfter = +bal - +totalFee;

  console.log('');
  console.log(parseColor(colors, 'Wallet', 'cyan'));
  console.log(`Address: ${addy}`);
  console.log(`Current balance: ${bal}`);
  console.log(`Balance after deploy: ${balAfter}`);

  console.log('');

  return +balAfter;
}
