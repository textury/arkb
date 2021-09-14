import { join } from 'path';

export function cliVersion() {
  const version = require(join('..', 'package.json')).version;
  console.log(`v${version}`);
  process.exit(0);
}
