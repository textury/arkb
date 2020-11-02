import chalk from 'chalk';
import inquirer from 'inquirer';

const cliQuestions = {
  askWalletPassword: (message = 'Type your password') => {
    return inquirer.prompt([
      {
        name: 'password',
        type: 'password',
        message,
        validate: (val: string) => {
          if (val.length) {
            return true;
          }

          return 'Please enter a password';
        },
      },
    ]);
  },
  showConfirm: () => {
    return inquirer.prompt([
      {
        name: 'confirm',
        type: 'confirm',
        message: chalk.greenBright(
          'Carefully check the above details are correct, then confirm to complete this upload',
        ),
      },
    ]);
  },
};

export default cliQuestions;
