import OptionInterface from '../faces/option';

const option: OptionInterface = {
  name: 'wallet',
  alias: 'w',
  description: 'Set the key file path',
  arg: 'wallet_path',
  usage: 'path_to_keyfile.json',
};

export default option;
