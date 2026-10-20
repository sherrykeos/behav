import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { CreateBehaviorSchema, UpdateBehaviorSchema } from '@behav/domain';
import { db } from '../db/dbStore';

export const behaviorRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.addHook('onRequest', (fastify as unknown as { authenticate: unknown }).authenticate as never);

  // List Behaviors
  fastify.get('/', async (request, reply) => {
    const userId = request.user.userId;
    const query = request.query as { includeArchived?: string };
    const includeArchived = query.includeArchived === 'true';
    const list = await db.listBehaviorsByUser(userId, includeArchived);
    return reply.send({ data: list });
  });

  // Get Behavior by ID (strictly isolated to owner)
  fastify.get('/:id', async (request, reply) => {
    const userId = request.user.userId;
    const { id } = request.params as { id: string };

    const behavior = await db.findBehaviorById(id, userId);
    if (!behavior) {
      return reply.status(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: 'Behavior not found or access denied'
      });
    }

    return reply.send({ data: behavior });
  });

  // Create Behavior
  fastify.post('/', async (request, reply) => {
    const userId = request.user.userId;
    const parse = CreateBehaviorSchema.safeParse(request.body);

    if (!parse.success) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: parse.error.issues[0].message
      });
    }

    const created = await db.createBehavior({
      ...parse.data,
      userId // Guaranteed authenticated user ownership
    });

    return reply.status(201).send({ data: created });
  });

  // Update Behavior
  fastify.patch('/:id', async (request, reply) => {
    const userId = request.user.userId;
    const { id } = request.params as { id: string };
    const parse = UpdateBehaviorSchema.safeParse(request.body);

    if (!parse.success) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: parse.error.issues[0].message
      });
    }

    const updated = await db.updateBehavior(id, userId, parse.data);
    if (!updated) {
      return reply.status(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: 'Behavior not found or access denied'
      });
    }

    return reply.send({ data: updated });
  });

  // Soft-delete Behavior
  fastify.delete('/:id', async (request, reply) => {
    const userId = request.user.userId;
    const { id } = request.params as { id: string };

    const deleted = await db.softDeleteBehavior(id, userId);
    if (!deleted) {
      return reply.status(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: 'Behavior not found or access denied'
      });
    }

    return reply.send({ success: true, message: 'Behavior deleted successfully' });
  });
};
