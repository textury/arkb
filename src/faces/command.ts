import ArgumentsInterface from "./arguments";
import OptionInterface from "./option";

export default interface CommandInterface {
  name: string;
  aliases?: string[];
  options?: OptionInterface[];
  args?: string[];
  usage?: string[];
  description: string;
  execute: (args: ArgumentsInterface) => Promise<void>;
}