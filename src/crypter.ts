import crypto from 'crypto';

export default class Crypter {
  private passphrase: string = '';

  constructor(password: string) {
    this.passphrase = password;
  }

  encrypt(data: Buffer): Buffer {
    const key = crypto.pbkdf2Sync(this.passphrase, 'salt', 100000, 32, 'sha256')
    const algorithm = 'aes-256-cbc';
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(algorithm, key, iv);
    const encrypted = Buffer.concat([iv, cipher.update(data), cipher.final()])

    return encrypted;
}

  decrypt(encrypted: Buffer): Buffer {
    try {
      const algorithm = 'aes-256-cbc';
      const key = crypto.pbkdf2Sync(this.passphrase, 'salt', 100000, 32, 'sha256')
      const iv = encrypted.slice(0, 16);
      const data = encrypted.slice(16);
      const decipher = crypto.createDecipheriv(algorithm, key, iv);
      const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);

      return decrypted;
  } catch (error) {
      throw new Error('Failed to decrypt')
  }
  }
}
