import clui from 'clui';
import IpfsHttpClient from 'ipfs-http-client';
import Hash from 'ipfs-only-hash';

export default class IPFS {
  private logs: boolean = true;

  constructor(logs: boolean = true) {
    this.logs = logs;
  }

  async deploy(dir: string) {
    let countdown: clui.Spinner;
    if (this.logs) {
      countdown = new clui.Spinner(`Deploying to IPFS...`, ['⣾', '⣽', '⣻', '⢿', '⡿', '⣟', '⣯', '⣷']);
      countdown.start();
    }

    const ipfs = IpfsHttpClient({
      host: 'ipfs.infura.io',
      port: 5001,
      protocol: 'https',
    });

    // @ts-ignore
    const glob = IpfsHttpClient.globSource(dir, { recursive: true });
    const files = await ipfs.add(glob);
    countdown.stop();

    return files;
  }

  async hash(data: Buffer) {
    return Hash.of(data);
  }
}
