import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { CreateEntrySchema, UpdateEntrySchema } from '@behav/domain';
import { db } from '../db/dbStore';

export const entryRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.addHook('onRequest', (fastify as unknown as { authenticate: unknown }).authenticate as never);

  // List Entries
  fastify.get('/', async (request, reply) => {
    const userId = request.user.userId;
    const query = request.query as { behaviorId?: string };
    const list = await db.listEntriesByUser(userId, query.behaviorId);
    return reply.send({ data: list });
  });

  // Get Entry by ID
  fastify.get('/:id', async (request, reply) => {
    const userId = request.user.userId;
    const { id } = request.params as { id: string };

    const entry = await db.findEntryById(id, userId);
    if (!entry) {
      return reply.status(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: 'Entry not found or access denied'
      });
    }

    return reply.send({ data: entry });
  });

  // Create Entry
  fastify.post('/', async (request, reply) => {
    const userId = request.user.userId;
    const parse = CreateEntrySchema.safeParse(request.body);

    if (!parse.success) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: parse.error.issues[0].message
      });
    }

    // Security Check: Verify that the parent behavior belongs to the authenticated user!
    const behavior = await db.findBehaviorById(parse.data.behaviorId, userId);
    if (!behavior) {
      return reply.status(403).send({
        statusCode: 403,
        error: 'Forbidden',
        message: 'Parent behavior does not exist or belongs to another account'
      });
    }

    const created = await db.createEntry({
      ...parse.data,
      userId
    });

    return reply.status(201).send({ data: created });
  });

  // Update Entry
  fastify.patch('/:id', async (request, reply) => {
    const userId = request.user.userId;
    const { id } = request.params as { id: string };
    const parse = UpdateEntrySchema.safeParse(request.body);

    if (!parse.success) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: parse.error.issues[0].message
      });
    }

    const updated = await db.updateEntry(id, userId, parse.data);
    if (!updated) {
      return reply.status(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: 'Entry not found or access denied'
      });
    }

    return reply.send({ data: updated });
  });

  // Delete Entry (soft delete)
  fastify.delete('/:id', async (request, reply) => {
    const userId = request.user.userId;
    const { id } = request.params as { id: string };

    const deleted = await db.softDeleteEntry(id, userId);
    if (!deleted) {
      return reply.status(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: 'Entry not found or access denied'
      });
    }

    return reply.send({ success: true, message: 'Entry deleted successfully' });
  });
};
