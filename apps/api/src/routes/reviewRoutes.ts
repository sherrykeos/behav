import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { DailyReviewInputSchema } from '@behav/domain';
import { db } from '../db/dbStore';

export const reviewRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.addHook('onRequest', (fastify as unknown as { authenticate: unknown }).authenticate as never);

  // List Reviews
  fastify.get('/', async (request, reply) => {
    const userId = request.user.userId;
    const query = request.query as { behaviorId: string };

    if (!query.behaviorId) {
      return reply.status(400).send({ message: 'behaviorId is required' });
    }

    const list = await db.listReviews(userId, query.behaviorId);
    return reply.send({ data: list });
  });

  // Upsert Daily Review
  fastify.post('/', async (request, reply) => {
    const userId = request.user.userId;
    const parse = DailyReviewInputSchema.safeParse(request.body);

    if (!parse.success) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: parse.error.issues[0].message
      });
    }

    // Verify behavior ownership
    const behavior = await db.findBehaviorById(parse.data.behaviorId, userId);
    if (!behavior) {
      return reply.status(403).send({
        statusCode: 403,
        error: 'Forbidden',
        message: 'Parent behavior does not exist or belongs to another user'
      });
    }

    const review = await db.upsertReview({
      userId,
      behaviorId: parse.data.behaviorId,
      localDate: parse.data.localDate,
      timezone: parse.data.timezone,
      status: parse.data.status,
      notes: parse.data.notes
    });

    return reply.status(200).send({ data: review });
  });
};
