import Blockweave from 'blockweave';
import Api from 'arweave/node/lib/api';
import Conf from 'conf';
import minimist from 'minimist';
import Tags from '../lib/tags';
import CommandInterface from './command';
import OptionInterface from './option';

export default interface ArgumentsInterface {
  argv: minimist.ParsedArgs;
  blockweave: Blockweave;
  config: Conf;
  debug: boolean;
  command: string;
  commandValues: string[];
  walletPath: string;
  index: string;
  license: string;
  autoConfirm: boolean;
  tags: Tags;
  bundle: boolean;
  useBundler: string;
  feeMultiplier: number;
  commands: Map<string, CommandInterface>;
  options: Map<string, OptionInterface>;
  bundler?: Api;
  colors: boolean;
}
