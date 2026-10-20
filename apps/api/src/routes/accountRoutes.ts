import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { UserSettingsSchema } from '@behav/domain';
import { db } from '../db/dbStore';
import crypto from 'crypto';

export const accountRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.addHook('onRequest', (fastify as unknown as { authenticate: unknown }).authenticate as never);

  // Get Profile
  fastify.get('/profile', async (request, reply) => {
    const userId = request.user.userId;
    const user = await db.findUserById(userId);
    if (!user) {
      return reply.status(404).send({ message: 'User not found' });
    }

    const { passwordHash: _, ...safeUser } = user;
    const settings = db.userSettings.get(userId) || null;

    return reply.send({
      user: safeUser,
      settings
    });
  });

  // Update Settings
  fastify.patch('/settings', async (request, reply) => {
    const userId = request.user.userId;
    const parse = UserSettingsSchema.partial().safeParse(request.body);

    if (!parse.success) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: parse.error.issues[0].message
      });
    }

    const existing = db.userSettings.get(userId) || {
      userId,
      theme: 'dark',
      timezone: 'UTC',
      locale: 'en',
      dayBoundaryHour: 0,
      preferences: {},
      updatedAt: new Date().toISOString()
    };

    const updated = {
      ...existing,
      ...parse.data,
      updatedAt: new Date().toISOString()
    };
    db.userSettings.set(userId, updated);

    return reply.send({ settings: updated });
  });

  // Export User Data (GDPR & Data Portability)
  fastify.get('/export', async (request, reply) => {
    const userId = request.user.userId;
    const user = await db.findUserById(userId);
    if (!user) {
      return reply.status(404).send({ message: 'User not found' });
    }

    const { passwordHash: _, ...safeUser } = user;
    const settings = db.userSettings.get(userId) || null;
    const behaviors = await db.listBehaviorsByUser(userId, true);
    const entries = await db.listEntriesByUser(userId);
    const goals = await db.listGoalsByUser(userId);

    const exportPayload = {
      exportMetadata: {
        application: 'Behav',
        version: '1.0.0',
        exportedAt: new Date().toISOString(),
        userId
      },
      user: safeUser,
      settings,
      behaviors,
      entries,
      goals
    };

    reply.header('Content-Type', 'application/json');
    reply.header('Content-Disposition', `attachment; filename="behav_export_${userId}.json"`);
    return reply.send(exportPayload);
  });

  // Request Account Deletion
  fastify.post('/delete-request', async (request, reply) => {
    const userId = request.user.userId;
    const now = new Date();
    // 14-day grace period
    const scheduledFor = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString();

    const deletionRequest = {
      id: crypto.randomUUID(),
      userId,
      requestedAt: now.toISOString(),
      scheduledFor,
      status: 'PENDING' as const,
      completedAt: null
    };
    db.deletionRequests.set(deletionRequest.id, deletionRequest);

    return reply.status(202).send({
      message: 'Account deletion scheduled. Your data will be completely removed after the grace period.',
      scheduledFor
    });
  });
};
