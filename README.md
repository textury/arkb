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
yarn global add arkb # recommended
```

or

```
npm install -g arkb
```

> **Note:** The installation of arkb needs node >=15.11.0 or you will get an error when using `arkb`.  To manage multiple active nodejs, we recommend you have [nvm](https://github.com/nvm-sh/nvm) installed on your computer, then you can switch different node in a simple command. 

And run:

```
arkb help
```

> **Note:** If you are planning to upload large batches of data transactions to the Arweave network, it is *strongly* advised that you use the `--use-bundler` option instead of regular deploy to avoid transaction failures. You can read about bundles and their advantages on the [Arwiki](https://arwiki.wiki/#/en/preview/WUAtjfiDQEIqhsUcHXIFTn5ZmeDIE7If9hJREBLRgak).



```
                    d8b        d8b
                    ?88        ?88
                     88b        88b
 d888b8b    88bd88b  888  d88'  888888b
d8P' ?88    88P'  `  888bd8P'   88P `?8b
88b  ,88b  d88      d88888b    d88,  d88
`?88P'`88bd88'     d88' `?88b,d88'`?88P'



Usage: arkb [options] [command]

Options                                 Description
--auto-confirm                          Skips the confirm screen
--concurrency -c <number>               Multi thread, default is 5
--debug                                 Display log messages
--fee-multiplier -m <number>            Set the fee multiplier for all transactions
--force -f                              Force a redeploy of all the files
--gateway -g <host_or_ip>               Set the gateway hostname or ip address
--help -h                               Show usage help for a command
--license                               Specify the license of your upload with an spdx li
--no-colors                             Print to terminal without fancy colors
--tag-name <name>                       Set a tag name
--tag-value <value>                     Set a tag value
--timeout -t <number>                   Set the request timeout
--bundle                                Locally bundle your files and deploy to Arweave
--use-bundler <host_or_ip>              Use an ans104 bundler service
--wallet -w <wallet_path>               Set the key file path

Commands (alias)                        Description
balance (b)                             Get the current balance of your wallet
deploy (d) <folder_or_file>             Deploy a directory or file
fund-bundler <amount>                   Fund your bundler account
help (h)                                Show usage help for a command
network (n)                             Get the current network info
status (s) <txid>                       Check the status of a transaction ID
transfer <address> <amount>             Send funds to an Arweave wallet
version (v)                             Show the current arkb version number
wallet-export (we)                      Exports a previously saved wallet
wallet-forget (wf)                      Removes a previously saved wallet
wallet-save (ws) <wallet_path>          Saves a wallet, removes the need of the --wallet option
withdraw-bundler <amount>               Withdraw from your bundler balance
```

## Contributing

1.  Create a fork
2.  Create your feature branch: `git checkout -b my-feature`
3.  Commit your changes: `git commit -am 'Add some feature'`
4.  Push to the branch: `git push origin my-new-feature`
5.  Submit a pull request 🚀