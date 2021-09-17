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
arkb help
```

> **Note:** If you are planning to upload large batches of data transactions to the Arweave network, it is *strongly* advised that you use the `--use-bundler` option instead of regular deploy to avoid transaction failures. You can read about bundles and their advantages on the [Arwiki](https://arwiki.wiki/#/en/preview/WUAtjfiDQEIqhsUcHXIFTn5ZmeDIE7If9hJREBLRgak).



```
                    ?88        ?88      
                     88b        88b     
 d888b8b    88bd88b  888  d88'  888888b 
d8P' ?88    88P'  `  888bd8P'   88P `?8b
88b  ,88b  d88      d88888b    d88,  d88
`?88P'`88bd88'     d88' `?88b,d88'`?88P'



Usage: arkb [options] [command]

Options                                 Description
-------------------------------------   -------------------------------------------------
--gateway=<host_or_ip>                  Set the network hostname or ip
--use-bundler=<host_or_ip>              Use ans104 and bundler host
--ipfs-publish                          Publish to Arweave+IPFS
--auto-confirm                          Skips the confirm screen
--fee-multiplier=<number>               Set the fee multiplier for all transactions
--timeout=<number>                      Set the request timeout
--tag.Tag-Name=<tagvalue>               Set tags to your files
--wallet=<wallet_path>                  Set the key file path
--debug                                 Display additional logging

Commands (alias)                        Description
-------------------------------------   -------------------------------------------------
help (h)                                Display this message
version (v)                             Display the current version
deploy (d) <dir_path> [options]         Deploy a directory
status (s) <tx_id> [options]            Check the status of a transaction ID
balance (b) [options]                   Get the wallet balance
network (n) [options]                   Get the network info
wallet-save (ws) <wallet_file_path>     Save a wallet to remove the need for the --wallet option
wallet-export (we)                      Decrypt and export the saved wallet file
wallet-forget (wf)                      Forget your saved wallet file

Examples
Without saving a wallet:
  arkb deploy folder/path/ --wallet path/to/my/wallet.json

Saving a wallet:
  arkb wallet-save path/to/wallet.json
  arkb deploy folder/path/
  arkb deploy folder/file.html

Using a bundler:
  arkb deploy folder --use-bundler http://bundler.arweave.net:10000
```

## Contributing

1.  Create a fork
2.  Create your feature branch: `git checkout -b my-feature`
3.  Commit your changes: `git commit -am 'Add some feature'`
4.  Push to the branch: `git push origin my-new-feature`
5.  Submit a pull request 🚀