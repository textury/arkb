/**
 * utils.ts - Various utility functions
 */

import Blockweave from 'blockweave';
import fs from 'fs';
import path from 'path';
import minimist from 'minimist';

export function setArweaveInstance(argv: minimist.ParsedArgs, debug: boolean): Blockweave {
  const timeout = argv.timeout || 20000;
  const gateway = argv.gateway || 'https://arweave.net';

  return new Blockweave(
    {
      url: gateway,
      timeout,
      logging: debug,
    },
    [gateway],
  );
}

export function isValidWalletAddress(address: string): boolean {
  return /[a-z0-9_-]{43}/i.test(address);
}

export function bytesForHumans(bytes: number): string {
  const sizes = ['Bytes', 'kB', 'MB', 'GB', 'TB', 'PB', 'EB'];

  let output: string;

  sizes.forEach((unit, id) => {
    const s = Math.pow(1024, id);
    let fixed = '';
    if (bytes >= s) {
      fixed = String((bytes / s).toFixed(2));
      if (fixed.indexOf('.0') === fixed.length - 2) {
        fixed = fixed.slice(0, -2);
      }
      output = `${fixed} ${unit}`;
    }
  });

  if (!output) {
    return `0 Bytes`;
  }

  return output;
}

export function numbersForHumans(x: number): string {
  return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

export function dirExists(dir: string): boolean {
  return fs.existsSync(dir);
}

export function getUserDirectory(): string {
  return process.cwd();
}

export function getPackageVersion(): string {
  return require(path.join(__dirname, '..', '..', 'package.json')).version;
}

export async function pause(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// tslint:disable-next-line: variable-name
export function snakeCaseToTitleCase(snake_case: string): string {
  const sentence = snake_case.toLowerCase().split('_');
  for (let i = 0; i < sentence.length; i++) {
    sentence[i] = sentence[i][0].toUpperCase() + sentence[i].slice(1);
  }

  return sentence.join(' ');
}
