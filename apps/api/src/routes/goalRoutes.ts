import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { CreateGoalSchema, UpdateGoalSchema } from '@behav/domain';
import { db } from '../db/dbStore';

export const goalRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.addHook('onRequest', (fastify as unknown as { authenticate: unknown }).authenticate as never);

  // List Goals
  fastify.get('/', async (request, reply) => {
    const userId = request.user.userId;
    const query = request.query as { behaviorId?: string };
    const list = await db.listGoalsByUser(userId, query.behaviorId);
    return reply.send({ data: list });
  });

  // Create Goal
  fastify.post('/', async (request, reply) => {
    const userId = request.user.userId;
    const parse = CreateGoalSchema.safeParse(request.body);

    if (!parse.success) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: parse.error.issues[0].message
      });
    }

    // Security check: Verify behavior ownership
    const behavior = await db.findBehaviorById(parse.data.behaviorId, userId);
    if (!behavior) {
      return reply.status(403).send({
        statusCode: 403,
        error: 'Forbidden',
        message: 'Parent behavior does not exist or belongs to another user'
      });
    }

    const created = await db.createGoal({
      ...parse.data,
      userId,
      active: true
    });

    return reply.status(201).send({ data: created });
  });

  // Update Goal (preserves historical versioning)
  fastify.patch('/:id', async (request, reply) => {
    const userId = request.user.userId;
    const { id } = request.params as { id: string };
    const parse = UpdateGoalSchema.safeParse(request.body);

    if (!parse.success) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: parse.error.issues[0].message
      });
    }

    const updated = await db.updateGoal(id, userId, parse.data);
    if (!updated) {
      return reply.status(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: 'Goal not found or access denied'
      });
    }

    return reply.send({ data: updated });
  });

  // List Goal Versions (audit history)
  fastify.get('/:id/versions', async (request, reply) => {
    const userId = request.user.userId;
    const { id } = request.params as { id: string };

    const goal = await db.findGoalById(id, userId);
    if (!goal) {
      return reply.status(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: 'Goal not found or access denied'
      });
    }

    const versions = await db.listGoalVersions(id, userId);
    return reply.send({ data: versions });
  });
};
