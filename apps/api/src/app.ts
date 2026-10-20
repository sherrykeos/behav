import fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import { authPlugin } from './plugins/authPlugin';
import { authRoutes } from './routes/authRoutes';
import { behaviorRoutes } from './routes/behaviorRoutes';
import { entryRoutes } from './routes/entryRoutes';
import { goalRoutes } from './routes/goalRoutes';
import { reviewRoutes } from './routes/reviewRoutes';
import { analyticsRoutes } from './routes/analyticsRoutes';
import { accountRoutes } from './routes/accountRoutes';

export function buildApp(): FastifyInstance {
  const app = fastify({
    logger: false,
    trustProxy: true
  });

  // Security Headers
  app.register(helmet, {
    contentSecurityPolicy: false
  });

  // CORS
  app.register(cors, {
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']
  });

  // Rate Limiting on sensitive routes
  app.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute'
  });

  // Authentication Plugin (JWT & user isolation)
  app.register(authPlugin);

  // Health check
  app.get('/health', async () => {
    return { status: 'healthy', timestamp: new Date().toISOString() };
  });

  // Register API Routes
  app.register(authRoutes, { prefix: '/api/auth' });
  app.register(behaviorRoutes, { prefix: '/api/behaviors' });
  app.register(entryRoutes, { prefix: '/api/entries' });
  app.register(goalRoutes, { prefix: '/api/goals' });
  app.register(reviewRoutes, { prefix: '/api/reviews' });
  app.register(analyticsRoutes, { prefix: '/api/analytics' });
  app.register(accountRoutes, { prefix: '/api/account' });

  return app;
}
