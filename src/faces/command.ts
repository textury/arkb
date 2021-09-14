import ArgumentsInterface from "./arguments";

export default interface CommandInterface {
  name: string;
  aliases: string[];
  description: string;
  useOptions: boolean;
  args: string[];
  execute: (args: ArgumentsInterface) => Promise<void>;
}