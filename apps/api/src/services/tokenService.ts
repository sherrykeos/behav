import crypto from 'crypto';

export interface TokenPayload {
  userId: string;
  email: string;
  accountStatus: string;
}

export class TokenService {
  private static readonly SECRET = process.env.JWT_SECRET || 'behav-production-jwt-secret-key-min-32-chars';

  /**
   * Hashes a refresh token using SHA-256 for secure database storage.
   */
  public static hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Generates a cryptographically secure random refresh token.
   */
  public static generateRefreshToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Generates a 6-digit numeric code or secure token for email verification / password reset.
   */
  public static generateVerificationCode(): string {
    return crypto.randomInt(100000, 999999).toString();
  }

  /**
   * Signs a short-lived access token with HMAC SHA-256.
   */
  public static signAccessToken(payload: TokenPayload, expiresInSeconds: number = 900): string {
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const exp = Math.floor(Date.now() / 1000) + expiresInSeconds;
    const body = Buffer.from(JSON.stringify({ ...payload, exp })).toString('base64url');
    const signature = crypto
      .createHmac('sha256', this.SECRET)
      .update(`${header}.${body}`)
      .digest('base64url');

    return `${header}.${body}.${signature}`;
  }

  /**
   * Verifies and decodes an access token.
   */
  public static verifyAccessToken(token: string): (TokenPayload & { exp: number }) | null {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [header, body, signature] = parts;
    const expectedSig = crypto
      .createHmac('sha256', this.SECRET)
      .update(`${header}.${body}`)
      .digest('base64url');

    const sigBuf = Buffer.from(signature);
    const expBuf = Buffer.from(expectedSig);

    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      return null;
    }

    try {
      const decoded = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
      if (decoded.exp && decoded.exp < Math.floor(Date.now() / 1000)) {
        return null; // Expired
      }
      return decoded;
    } catch {
      return null;
    }
  }
}
