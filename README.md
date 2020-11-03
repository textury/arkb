# arkb
Arweave Deploy that saves you data costs.

## Features
- No file size limit.
- No amount of files limit.
- Doesn't upload files that you have already uploaded.

## How to use
arkb runs using NodeJS and NPM. You must have both installed on your machine for it to work.

Install arkb:
```
npm install -g arkb
```

And run:
```
arkb --help
```

```
                    ?88        ?88      
                     88b        88b     
 d888b8b    88bd88b  888  d88'  888888b 
d8P' ?88    88P'  `  888bd8P'   88P `?8b
88b  ,88b  d88      d88888b    d88,  d88
`?88P'`88bd88'     d88' `?88b,d88'`?88P'



Usage: arkb [options] [command]

Options                                 Description
-v --version                            Show the version number
--host                                  Set the network hostname or ip
--protocol                              Set the network protocol (http or https)
--port                                  Set the netwrok port
--timeout                               Set the request timeout
--wallet                                Set the key file path
--debug                                 Display additional logging
-h --help                               Display this message

Commands                                Description
deploy <dir_path> [options]             Deploy a directory
status <tx_id>                          Check the status of a transaction ID
balance                                 Get the current balance of your wallet
network                                 Get the current network info
wallet-save <wallet_file_path>          Save a wallet to remove the need for the --wallet option
wallet-export                           Decrypt and export the saved wallet file
wallet-forget                           Forget your saved wallet file

Examples
Without saving a wallet:
  arkb deploy folder/path/ --wallet path/to/my/wallet.json

Saving a wallet:
  arkb wallet-save path/to/wallet.json
  arkb deploy folder/path/
```