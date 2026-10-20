import crypto from 'crypto';

/**
 * Production-grade password hashing service using scrypt.
 * Generates cryptographically secure 16-byte random salts.
 * Formats hashes as "scrypt:salt:hash".
 * Performs timing-safe comparisons to prevent timing side-channel attacks.
 */
export class PasswordService {
  private static readonly KEY_LEN = 64;
  private static readonly COST = 16384;
  private static readonly BLOCK_SIZE = 8;
  private static readonly PARALLELISM = 1;

  public static async hash(password: string): Promise<string> {
    const salt = crypto.randomBytes(16).toString('hex');
    const derivedKey = await new Promise<Buffer>((resolve, reject) => {
      crypto.scrypt(
        password,
        salt,
        this.KEY_LEN,
        {
          N: this.COST,
          r: this.BLOCK_SIZE,
          p: this.PARALLELISM
        },
        (err, key) => {
          if (err) reject(err);
          else resolve(key);
        }
      );
    });

    return `scrypt:${salt}:${derivedKey.toString('hex')}`;
  }

  public static async verify(password: string, storedHash: string): Promise<boolean> {
    const parts = storedHash.split(':');
    if (parts.length !== 3 || parts[0] !== 'scrypt') {
      return false;
    }

    const salt = parts[1];
    const originalHash = Buffer.from(parts[2], 'hex');

    const derivedKey = await new Promise<Buffer>((resolve, reject) => {
      crypto.scrypt(
        password,
        salt,
        this.KEY_LEN,
        {
          N: this.COST,
          r: this.BLOCK_SIZE,
          p: this.PARALLELISM
        },
        (err, key) => {
          if (err) reject(err);
          else resolve(key);
        }
      );
    });

    if (derivedKey.length !== originalHash.length) {
      return false;
    }

    return crypto.timingSafeEqual(derivedKey, originalHash);
  }
}
