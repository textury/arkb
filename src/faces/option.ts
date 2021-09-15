import ArgumentsInterface from "./arguments";

export default interface OptionInterface {
  name: string;
  alias?: string;
  description: string;
  arg?: string;
  usage?: string;
}