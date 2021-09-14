#!/usr/bin/env node

import minimist from 'minimist';
import Conf from 'conf';
import { cliTask } from './commands';
import { setArweaveInstance } from './utils/utils';

const argv = minimist(process.argv.slice(2));
const config = new Conf();
const debug = !!argv.debug;
const arweave = setArweaveInstance(argv, debug);
cliTask(argv, arweave, config, debug);
