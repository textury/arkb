import Transaction from 'arweave/node/lib/transaction';

export default class Tags {
  private _tags: Map<string, string> = new Map();

  public get tags(): { name: string; value: string }[] {
    return Array.from(this._tags.entries()).map(([name, value]) => ({ name, value }));
  }

  public addTag(key: string, value: string): void {
    this._tags.set(key, value);
  }

  public addTags(tags: { name: string; value: string }[]): void {
    tags.forEach(({ name, value }) => this.addTag(name, value));
  }

  public addTagsToTransaction(tx: Transaction): void {
    this.tags.forEach(({ name, value }) => tx.addTag(name, value));
  }
}
