import path from 'path';
import normalize from 'normalize-path';
import clc from 'cli-color';
import { dirExists, getUserDirectory } from './utils';

export function getDeployPath(commandValues: string[]): string {
  // Check if we have received a command value
  if (!commandValues || !commandValues.length) {
    console.log(clc.red('You forgot to set the directory or file that you want to deploy.'));
    process.exit(0);
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
      process.exit(0);
    }
  }

  return dir;
}