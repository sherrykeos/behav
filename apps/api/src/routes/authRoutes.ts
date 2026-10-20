import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import {
  RegisterInputSchema,
  LoginInputSchema,
  PasswordResetRequestSchema,
  PasswordResetConfirmSchema
} from '@behav/domain';
import { db } from '../db/dbStore';
import { PasswordService } from '../services/passwordService';
import { TokenService } from '../services/tokenService';

export const authRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  // Register
  fastify.post('/register', async (request, reply) => {
    const parse = RegisterInputSchema.safeParse(request.body);
    if (!parse.success) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: parse.error.issues[0].message
      });
    }

    const { email, password, displayName } = parse.data;

    const existing = await db.findUserByEmail(email);
    if (existing) {
      // Do not disclose detailed account existence if avoiding enumeration, but return standard conflict
      return reply.status(409).send({
        statusCode: 409,
        error: 'Conflict',
        message: 'An account with this email address already exists'
      });
    }

    const passwordHash = await PasswordService.hash(password);
    const user = await db.createUser({
      email,
      passwordHash,
      displayName,
      accountStatus: 'ACTIVE'
    });

    const accessToken = TokenService.signAccessToken({
      userId: user.id,
      email: user.email,
      accountStatus: user.accountStatus
    });

    const rawRefreshToken = TokenService.generateRefreshToken();
    const refreshTokenHash = TokenService.hashToken(rawRefreshToken);
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days

    await db.createSession({
      userId: user.id,
      refreshTokenHash,
      expiresAt,
      userAgent: request.headers['user-agent'],
      ipAddress: request.ip
    });

    return reply.status(201).send({
      user,
      accessToken,
      refreshToken: rawRefreshToken,
      expiresIn: 900
    });
  });

  // Login
  fastify.post('/login', async (request, reply) => {
    const parse = LoginInputSchema.safeParse(request.body);
    if (!parse.success) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: parse.error.issues[0].message
      });
    }

    const { email, password } = parse.data;
    const userRecord = await db.findUserByEmail(email);

    if (!userRecord || !userRecord.passwordHash) {
      return reply.status(401).send({
        statusCode: 401,
        error: 'Unauthorized',
        message: 'Invalid email or password'
      });
    }

    const valid = await PasswordService.verify(password, userRecord.passwordHash);
    if (!valid) {
      return reply.status(401).send({
        statusCode: 401,
        error: 'Unauthorized',
        message: 'Invalid email or password'
      });
    }

    const accessToken = TokenService.signAccessToken({
      userId: userRecord.id,
      email: userRecord.email,
      accountStatus: userRecord.accountStatus
    });

    const rawRefreshToken = TokenService.generateRefreshToken();
    const refreshTokenHash = TokenService.hashToken(rawRefreshToken);
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    await db.createSession({
      userId: userRecord.id,
      refreshTokenHash,
      expiresAt,
      userAgent: request.headers['user-agent'],
      ipAddress: request.ip
    });

    const { passwordHash: _, ...safeUser } = userRecord;

    return reply.send({
      user: safeUser,
      accessToken,
      refreshToken: rawRefreshToken,
      expiresIn: 900
    });
  });

  // Refresh Token Rotation
  fastify.post('/refresh', async (request, reply) => {
    const body = request.body as { refreshToken?: string };
    if (!body || !body.refreshToken) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Missing refreshToken'
      });
    }

    const tokenHash = TokenService.hashToken(body.refreshToken);
    const session = await db.findSessionByTokenHash(tokenHash);

    if (!session) {
      return reply.status(401).send({
        statusCode: 401,
        error: 'Unauthorized',
        message: 'Invalid or revoked refresh token'
      });
    }

    // Revoke old session (Rotation)
    await db.revokeSession(session.id);

    const user = await db.findUserById(session.userId);
    if (!user) {
      return reply.status(401).send({
        statusCode: 401,
        error: 'Unauthorized',
        message: 'User no longer exists'
      });
    }

    const newAccessToken = TokenService.signAccessToken({
      userId: user.id,
      email: user.email,
      accountStatus: user.accountStatus
    });

    const newRawRefreshToken = TokenService.generateRefreshToken();
    const newRefreshTokenHash = TokenService.hashToken(newRawRefreshToken);
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    await db.createSession({
      userId: user.id,
      refreshTokenHash: newRefreshTokenHash,
      expiresAt,
      userAgent: request.headers['user-agent'],
      ipAddress: request.ip
    });

    return reply.send({
      accessToken: newAccessToken,
      refreshToken: newRawRefreshToken,
      expiresIn: 900
    });
  });

  // Logout
  fastify.post('/logout', async (request, reply) => {
    const body = request.body as { refreshToken?: string };
    if (body && body.refreshToken) {
      const tokenHash = TokenService.hashToken(body.refreshToken);
      const session = await db.findSessionByTokenHash(tokenHash);
      if (session) {
        await db.revokeSession(session.id);
      }
    }

    return reply.send({ success: true, message: 'Logged out successfully' });
  });

  // Forgot Password Request
  fastify.post('/forgot-password', async (request, reply) => {
    const parse = PasswordResetRequestSchema.safeParse(request.body);
    if (!parse.success) {
      return reply.status(400).send({ message: parse.error.issues[0].message });
    }

    const user = await db.findUserByEmail(parse.data.email);
    if (user) {
      const resetCode = TokenService.generateVerificationCode();
      const tokenHash = TokenService.hashToken(resetCode);
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour
      await db.createVerificationToken({
        userId: user.id,
        tokenHash,
        type: 'PASSWORD_RESET',
        expiresAt
      });
    }

    // Generic response to prevent account enumeration
    return reply.send({
      success: true,
      message: 'If the email is registered, instructions have been dispatched.'
    });
  });

  // Reset Password Confirm
  fastify.post('/reset-password', async (request, reply) => {
    const parse = PasswordResetConfirmSchema.safeParse(request.body);
    if (!parse.success) {
      return reply.status(400).send({ message: parse.error.issues[0].message });
    }

    const { token, newPassword } = parse.data;
    const tokenHash = TokenService.hashToken(token);
    const validToken = await db.findValidToken(tokenHash, 'PASSWORD_RESET');

    if (!validToken) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Invalid or expired password reset token'
      });
    }

    const user = await db.findUserById(validToken.userId);
    if (!user) {
      return reply.status(404).send({ message: 'User not found' });
    }

    const newHash = await PasswordService.hash(newPassword);
    user.passwordHash = newHash;
    user.updatedAt = new Date().toISOString();

    await db.markTokenUsed(validToken.id);
    // Security: Revoke all existing sessions upon password reset!
    await db.revokeAllUserSessions(user.id);

    return reply.send({
      success: true,
      message: 'Password successfully reset. Please log in with your new password.'
    });
  });
};
