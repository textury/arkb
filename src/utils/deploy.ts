import path from 'path';
import normalize from 'normalize-path';
import { dirExists, getUserDirectory, parseColor } from './utils';

export function getDeployPath(commandValues: string[], colors?: boolean): string {
  // Check if we have received a command value
  if (!commandValues || !commandValues.length) {
    console.log(parseColor(colors, 'You forgot to set the directory or file that you want to deploy.', 'red'));
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
      console.log(parseColor(colors, `The directory or file does not exist.`, 'red'));
      process.exit(0);
    }
  }

  return dir;
}
