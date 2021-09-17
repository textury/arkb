import OptionInterface from '../faces/option';

const option: OptionInterface = {
  name: 'fee-multiplier',
  alias: 'm',
  description: 'Set the fee multiplier for all transactions',
  arg: 'number',
  usage: '1',
};

export default option;
