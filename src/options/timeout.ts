import OptionInterface from "../faces/option";

const option: OptionInterface = {
  name: "timeout",
  alias: "t",
  description: "Set the request timeout",
  arg: 'number',
  usage: '20000'
};

export default option;