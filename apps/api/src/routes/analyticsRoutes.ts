import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import {
  calculateDailyAggregate,
  groupEntriesByLocalDate,
  calculatePeriodStatistics,
  calculateTimeDistribution,
  calculateAdvancedTrends,
  generateDeterministicInsights,
  calculateStreak,
  DailyAggregate
} from '@behav/domain';
import { db } from '../db/dbStore';

export const analyticsRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.addHook('onRequest', (fastify as unknown as { authenticate: unknown }).authenticate as never);

  fastify.get('/behavior/:id', async (request, reply) => {
    const userId = request.user.userId;
    const { id: behaviorId } = request.params as { id: string };

    const behavior = await db.findBehaviorById(behaviorId, userId);
    if (!behavior) {
      return reply.status(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: 'Behavior not found or access denied'
      });
    }

    const entries = await db.listEntriesByUser(userId, behaviorId);
    const reviews = await db.listReviews(userId, behaviorId);
    const goals = await db.listGoalsByUser(userId, behaviorId);

    // Group entries by date
    const entriesByDate = groupEntriesByLocalDate(entries, 'UTC');
    const reviewsByDate = new Map(reviews.map((r) => [r.localDate, r]));

    // Build set of dates from entries, reviews, and past 30 days
    const dateSet = new Set<string>();
    entriesByDate.forEach((_, date) => dateSet.add(date));
    reviewsByDate.forEach((_, date) => dateSet.add(date));

    // Ensure past 14 days exist
    const today = new Date();
    for (let i = 0; i < 14; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      dateSet.add(d.toISOString().substring(0, 10));
    }

    const sortedDates = Array.from(dateSet).sort();
    const aggregates: DailyAggregate[] = sortedDates.map((localDate) => {
      const dayEntries = entriesByDate.get(localDate) || [];
      const dayReview = reviewsByDate.get(localDate) || null;
      return calculateDailyAggregate({
        userId,
        behaviorId,
        localDate,
        entries: dayEntries,
        review: dayReview
      });
    });

    const statistics = calculatePeriodStatistics(aggregates);
    const distribution = calculateTimeDistribution(entries);
    const trends = calculateAdvancedTrends(aggregates);
    const insights = generateDeterministicInsights(userId, behaviorId, aggregates, entries);

    // Evaluate goals and streaks
    const streaks = await Promise.all(
      goals.map(async (goal) => {
        const versions = await db.listGoalVersions(goal.id, userId);
        const streakResult = calculateStreak(goal, aggregates, versions);
        return {
          goalId: goal.id,
          goalType: goal.goalType,
          targetValue: goal.targetValue,
          evaluationPeriod: goal.evaluationPeriod,
          currentStreak: streakResult.currentStreak,
          longestStreak: streakResult.longestStreak,
          lastQualifiedDate: streakResult.lastQualifiedDate,
          dayResults: streakResult.dayResults.slice(-14) // recent 14 days
        };
      })
    );

    return reply.send({
      behaviorId,
      statistics,
      distribution,
      trends,
      insights,
      streaks,
      recentAggregates: aggregates.slice(-30)
    });
  });
};
