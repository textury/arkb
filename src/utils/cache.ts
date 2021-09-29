import clc from 'cli-color';
import fs from 'fs';
import path from 'path';

export interface CacheDataInterface {
  id: string;
  confirmed: boolean;
}

export default class Cache {
  private cache: Map<string, CacheDataInterface>;
  private cacheFile: string = path.join(__dirname, '..', '..', 'cached.json');

  constructor(public readonly debug: boolean = false, public readonly isArLocal: boolean) {
    if (this.isArLocal) {
      this.cacheFile = path.join(__dirname, '..', '..', 'cached-arlocal.json');
    }

    this.cache = new Map();

    if (fs.existsSync(this.cacheFile)) {
      try {
        const entries = JSON.parse(fs.readFileSync(this.cacheFile, 'utf8'));
        for (const [key, value] of entries) {
          this.cache.set(key, value);
        }
        // tslint:disable-next-line: no-empty
      } catch (e) {}
    }
  }

  public get(key: string): CacheDataInterface {
    if (this.debug) {
      console.log(clc.green('Cache GET: ' + key));
    }
    return this.cache.get(key);
  }

  public set(key: string, value: CacheDataInterface): void {
    if (this.debug) {
      console.log(clc.green('Cache SET: ' + key));
    }
    this.cache.set(key, value);
  }

  public has(key: string): boolean {
    return this.cache.has(key);
  }

  public delete(key: string): void {
    this.cache.delete(key);
  }

  public clear(): void {
    this.cache.clear();
  }

  public size(): number {
    return this.cache.size;
  }

  public save(): Promise<void> {
    if (this.debug) {
      console.log(clc.green('Cache SAVE...'));
    }
    return new Promise((resolve, reject) => {
      fs.writeFile(this.cacheFile, JSON.stringify(this.entries()), 'utf8', (err) => {
        if (err) {
          if (this.debug) {
            console.log(clc.red('Error saving cache: ' + err.message));
            reject(err);
          }
        }

        if (this.debug) {
          console.log(clc.green('Cache SAVED.'));
        }

        resolve();
      });
    });
  }

  public keys(): string[] {
    return Array.from(this.cache.keys());
  }

  public values(): CacheDataInterface[] {
    return Array.from(this.cache.values());
  }

  public entries(): [string, CacheDataInterface][] {
    return Array.from(this.cache.entries());
  }
}
