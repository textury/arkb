import Arweave from "arweave";
import Conf from "conf";
import minimist from "minimist";
import Tags from "../lib/tags";

export default interface ArgumentsInterface {
  argv: minimist.ParsedArgs;
  arweave: Arweave;
  config: Conf;
  debug: boolean;
  command: string;
  commandValue: string;
  wallet: string;
  index: string;
  ipfsPublish: boolean;
  autoConfirm: boolean;
  tags: Tags;
  useBundler: string;
  feeMultiplier: number;
};