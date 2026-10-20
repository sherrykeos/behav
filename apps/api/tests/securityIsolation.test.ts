import { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app';
import { db } from '../src/db/dbStore';
import { TokenService } from '../src/services/tokenService';

describe('Security & User Data Isolation', () => {
  let app: FastifyInstance;
  let userAToken: string;
  let userBToken: string;
  let userAId: string;
  let userBId: string;

  beforeAll(async () => {
    app = buildApp();
    await app.ready();
  });

  beforeEach(async () => {
    db.clear();

    // Register User A
    const resA = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: {
        email: 'usera@example.com',
        password: 'Password123!',
        displayName: 'User A'
      }
    });
    const dataA = JSON.parse(resA.payload);
    userAToken = dataA.accessToken;
    userAId = dataA.user.id;

    // Register User B
    const resB = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: {
        email: 'userb@example.com',
        password: 'Password123!',
        displayName: 'User B'
      }
    });
    const dataB = JSON.parse(resB.payload);
    userBToken = dataB.accessToken;
    userBId = dataB.user.id;
  });

  afterAll(async () => {
    await app.close();
  });

  it('strictly rejects unauthenticated requests', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/behaviors'
    });
    expect(res.statusCode).toBe(401);
  });

  it('rejects invalid or forged JWT tokens', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/behaviors',
      headers: {
        authorization: 'Bearer forged.token.signature'
      }
    });
    expect(res.statusCode).toBe(401);
  });

  it('rejects expired JWT tokens', async () => {
    // Generate an already-expired token (-60 seconds)
    const expiredToken = TokenService.signAccessToken(
      { userId: userAId, email: 'usera@example.com', accountStatus: 'ACTIVE' },
      -60
    );

    const res = await app.inject({
      method: 'GET',
      url: '/api/behaviors',
      headers: {
        authorization: `Bearer ${expiredToken}`
      }
    });
    expect(res.statusCode).toBe(401);
  });

  it('prevents cross-user read access to behaviors', async () => {
    // User A creates a behavior
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/behaviors',
      headers: { authorization: `Bearer ${userAToken}` },
      payload: {
        name: 'Private Behavior A',
        category: 'HEALTH',
        icon: 'heart',
        accentColor: '#4ADE80',
        measurementType: 'COUNT'
      }
    });
    expect(createRes.statusCode).toBe(201);
    const behaviorA = JSON.parse(createRes.payload).data;

    // User B attempts to read User A's behavior by known ID
    const crossReadRes = await app.inject({
      method: 'GET',
      url: `/api/behaviors/${behaviorA.id}`,
      headers: { authorization: `Bearer ${userBToken}` }
    });
    // Must return 404/Not Found (never expose existence or data)
    expect(crossReadRes.statusCode).toBe(404);

    // User B lists behaviors: must NOT include User A's behavior
    const listBRes = await app.inject({
      method: 'GET',
      url: '/api/behaviors',
      headers: { authorization: `Bearer ${userBToken}` }
    });
    const listB = JSON.parse(listBRes.payload).data;
    expect(listB.length).toBe(0);
  });

  it('prevents cross-user modification and deletion of behaviors', async () => {
    // User A creates a behavior
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/behaviors',
      headers: { authorization: `Bearer ${userAToken}` },
      payload: {
        name: 'Behavior A',
        category: 'HEALTH',
        icon: 'heart',
        accentColor: '#4ADE80',
        measurementType: 'COUNT'
      }
    });
    const behaviorA = JSON.parse(createRes.payload).data;

    // User B attempts to edit User A's behavior
    const patchRes = await app.inject({
      method: 'PATCH',
      url: `/api/behaviors/${behaviorA.id}`,
      headers: { authorization: `Bearer ${userBToken}` },
      payload: { name: 'Hacked by User B' }
    });
    expect(patchRes.statusCode).toBe(404);

    // User B attempts to delete User A's behavior
    const deleteRes = await app.inject({
      method: 'DELETE',
      url: `/api/behaviors/${behaviorA.id}`,
      headers: { authorization: `Bearer ${userBToken}` }
    });
    expect(deleteRes.statusCode).toBe(404);

    // Verify original behavior remains unchanged
    const verifyRes = await app.inject({
      method: 'GET',
      url: `/api/behaviors/${behaviorA.id}`,
      headers: { authorization: `Bearer ${userAToken}` }
    });
    expect(JSON.parse(verifyRes.payload).data.name).toBe('Behavior A');
  });

  it('rejects entry creation referencing another user’s behavior (ownership consistency)', async () => {
    // User A creates a behavior
    const createBeh = await app.inject({
      method: 'POST',
      url: '/api/behaviors',
      headers: { authorization: `Bearer ${userAToken}` },
      payload: {
        name: 'Target Behavior',
        category: 'HEALTH',
        icon: 'heart',
        accentColor: '#4ADE80',
        measurementType: 'COUNT'
      }
    });
    const behaviorA = JSON.parse(createBeh.payload).data;

    // User B attempts to log an entry against User A's behavior
    const createEntryRes = await app.inject({
      method: 'POST',
      url: '/api/entries',
      headers: { authorization: `Bearer ${userBToken}` },
      payload: {
        behaviorId: behaviorA.id,
        quantity: 1,
        occurredAt: new Date().toISOString(),
        timezone: 'UTC'
      }
    });
    // Forbidden: Behavior does not belong to User B!
    expect(createEntryRes.statusCode).toBe(403);
  });

  it('ignores client-supplied user_id tampering and strictly binds to authenticated caller', async () => {
    // User A attempts to pass user_id = User B's ID in body
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/behaviors',
      headers: { authorization: `Bearer ${userAToken}` },
      payload: {
        name: 'Tamper Test',
        category: 'HEALTH',
        icon: 'heart',
        accentColor: '#4ADE80',
        measurementType: 'COUNT',
        userId: userBId // Tampered ID
      }
    });
    expect(createRes.statusCode).toBe(201);
    const created = JSON.parse(createRes.payload).data;

    // Must be owned by User A, NOT User B
    expect(created.userId).toBe(userAId);
  });

  it('revokes session on logout so refresh token cannot be reused', async () => {
    // Login User A
    const loginRes = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: {
        email: 'usera@example.com',
        password: 'Password123!'
      }
    });
    const { refreshToken } = JSON.parse(loginRes.payload);

    // Logout
    const logoutRes = await app.inject({
      method: 'POST',
      url: '/api/auth/logout',
      payload: { refreshToken }
    });
    expect(logoutRes.statusCode).toBe(200);

    // Attempting to refresh with revoked token must fail
    const refreshRes = await app.inject({
      method: 'POST',
      url: '/api/auth/refresh',
      payload: { refreshToken }
    });
    expect(refreshRes.statusCode).toBe(401);
  });
});
