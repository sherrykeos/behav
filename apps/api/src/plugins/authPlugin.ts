import { FastifyInstance, FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';
import { TokenPayload, TokenService } from '../services/tokenService';

declare module 'fastify' {
  interface FastifyRequest {
    user: TokenPayload;
  }
}

const authPluginAsync: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.decorate(
    'authenticate',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const authHeader = request.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return reply.status(401).send({
          statusCode: 401,
          error: 'Unauthorized',
          message: 'Missing or malformed Authorization header'
        });
      }

      const token = authHeader.substring(7).trim();
      const payload = TokenService.verifyAccessToken(token);

      if (!payload) {
        return reply.status(401).send({
          statusCode: 401,
          error: 'Unauthorized',
          message: 'Invalid or expired access token'
        });
      }

      request.user = {
        userId: payload.userId,
        email: payload.email,
        accountStatus: payload.accountStatus
      };
    }
  );
};

export const authPlugin = fp(authPluginAsync);
