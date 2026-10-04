import { type INestApplication } from '@nestjs/common';
import { SessionError } from '@core/auth/nest';
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from '@core/auth';
import request, { type Response } from 'supertest';
import { accessClaims, bearer, cookieCleared, cookieValue, createApp, createFakeDelegate } from './session-harness.js';

/** A verifier the test controls. An unknown token is rejected. */
function fakeGoogle(tokens: Record<string, { subject: string; email?: string | null }>) {
  return {
    async verify(idToken: string) {
      const identity = tokens[idToken];
      if (!identity) throw new SessionError('Invalid Google token', 401);
      return identity;
    },
  };
}

function expectSession(res: Response): void {
  expect(res.body.status).toBe('success');
  expect(res.body.data.passwordHash).toBeUndefined();
  expect(cookieValue(res, ACCESS_TOKEN_COOKIE)).toBeTruthy();
  expect(cookieValue(res, REFRESH_TOKEN_COOKIE)).toBeTruthy();
}

describe('google sign-in (e2e)', () => {
  let app: INestApplication;

  afterEach(async () => {
    if (app) await app.close();
  });

  it('creates a user from a verified token, then returns that same user', async () => {
    app = await createApp(createFakeDelegate(), {
      google: fakeGoogle({
        'ada-token': { subject: 'google-ada', email: 'Ada@example.com' },
        'grace-token': { subject: 'google-grace', email: 'grace@example.com' },
      }),
    });
    const server = app.getHttpServer();

    const signedIn = await request(server)
      .post('/auth/google')
      .send({ idToken: 'ada-token' })
      .expect(200);
    expectSession(signedIn);
    expect(signedIn.body.message).toBe('Signed in');
    expect(signedIn.body.data.email).toBe('ada@example.com');
    expect(signedIn.body.data.phone).toBeNull();
    expect(accessClaims(signedIn).roles).toEqual(['owner']);
    const userId = signedIn.body.data.id;
    if (typeof userId !== 'string') throw new Error('signed-in user is missing an id');

    const again = await request(server).post('/auth/google').send({ idToken: 'ada-token' }).expect(200);
    expect(again.body.data.id).toBe(userId);

    const grace = await request(server).post('/auth/google').send({ idToken: 'grace-token' }).expect(200);
    expect(grace.body.data.id).not.toBe(userId);
    expect(accessClaims(grace).roles).toEqual([]);
  });

  it('rejects a token the verifier refuses and creates no user', async () => {
    app = await createApp(createFakeDelegate(), { google: fakeGoogle({}) });
    const server = app.getHttpServer();

    const rejected = await request(server).post('/auth/google').send({ idToken: 'forged' }).expect(401);
    expect(rejected.body.status).toBe('error');
    expect(cookieValue(rejected, ACCESS_TOKEN_COOKIE)).toBeUndefined();
    expect(cookieValue(rejected, REFRESH_TOKEN_COOKIE)).toBeUndefined();

    const registered = await request(server)
      .post('/auth/register')
      .send({ email: 'ada@example.com', password: 'correct horse' })
      .expect(201);
    expect(accessClaims(registered).roles).toEqual(['owner']);
  });

  it('refuses the route when Google is not configured and creates no user', async () => {
    app = await createApp();
    const server = app.getHttpServer();

    const refused = await request(server).post('/auth/google').send({ idToken: 'ada-token' }).expect(400);
    expect(refused.body.status).toBe('error');
    expect(refused.body.message).toMatch(/not configured/i);
    expect(cookieValue(refused, ACCESS_TOKEN_COOKIE)).toBeUndefined();
    expect(cookieValue(refused, REFRESH_TOKEN_COOKIE)).toBeUndefined();

    const registered = await request(server)
      .post('/auth/register')
      .send({ email: 'ada@example.com', password: 'correct horse' })
      .expect(201);
    expect(accessClaims(registered).roles).toEqual(['owner']);
  });

  it('rate limits repeated Google attempts separately from password sign-in', async () => {
    app = await createApp(createFakeDelegate(), {
      loginRateLimit: 2,
      google: fakeGoogle({ 'ada-token': { subject: 'google-ada', email: 'ada@example.com' } }),
    });
    const server = app.getHttpServer();

    await request(server).post('/auth/google').send({ idToken: 'ada-token' }).expect(200);
    await request(server).post('/auth/google').send({ idToken: 'ada-token' }).expect(200);
    const limited = await request(server).post('/auth/google').send({ idToken: 'ada-token' }).expect(429);
    expect(limited.body.status).toBe('error');
    expect(cookieValue(limited, ACCESS_TOKEN_COOKIE)).toBeUndefined();

    const login = await request(server)
      .post('/auth/login')
      .send({ email: 'ada@example.com', password: 'correct horse' })
      .expect(401);
    expect(login.body.status).toBe('error');
  });

  it('gives the Google user no password, and that user can refresh and sign out', async () => {
    app = await createApp(createFakeDelegate(), {
      google: fakeGoogle({ 'ada-token': { subject: 'google-ada', email: 'ada@example.com' } }),
    });
    const server = app.getHttpServer();

    const signedIn = await request(server).post('/auth/google').send({ idToken: 'ada-token' }).expect(200);
    const denied = await request(server)
      .post('/auth/login')
      .send({ email: 'ada@example.com', password: 'correct horse' })
      .expect(401);
    expect(cookieValue(denied, ACCESS_TOKEN_COOKIE)).toBeUndefined();

    const refreshed = await request(server)
      .post('/auth/refresh')
      .set('Cookie', bearer(signedIn, REFRESH_TOKEN_COOKIE))
      .expect(200);
    expectSession(refreshed);
    expect(refreshed.body.data.id).toBe(signedIn.body.data.id);

    const loggedOut = await request(server)
      .post('/auth/logout')
      .set('Cookie', bearer(refreshed, REFRESH_TOKEN_COOKIE))
      .expect(200);
    expect(cookieCleared(loggedOut, ACCESS_TOKEN_COOKIE)).toBe(true);
    expect(cookieCleared(loggedOut, REFRESH_TOKEN_COOKIE)).toBe(true);

    await request(server)
      .post('/auth/refresh')
      .set('Cookie', bearer(refreshed, REFRESH_TOKEN_COOKIE))
      .expect(401);
  });

  it('refuses a token for a deactivated user', async () => {
    app = await createApp(createFakeDelegate(), {
      google: fakeGoogle({
        'ada-token': { subject: 'google-ada', email: 'ada@example.com' },
        'grace-token': { subject: 'google-grace', email: 'grace@example.com' },
      }),
    });
    const server = app.getHttpServer();

    const ada = await request(server).post('/auth/google').send({ idToken: 'ada-token' }).expect(200);
    const grace = await request(server).post('/auth/google').send({ idToken: 'grace-token' }).expect(200);
    const graceId = grace.body.data.id;
    if (typeof graceId !== 'string') throw new Error('signed-in user is missing an id');

    await request(server)
      .post(`/auth/users/${graceId}/deactivate`)
      .set('Cookie', bearer(ada, ACCESS_TOKEN_COOKIE))
      .expect(200);

    const denied = await request(server).post('/auth/google').send({ idToken: 'grace-token' }).expect(401);
    expect(denied.body.message).toMatch(/invalid google token/i);
    expect(cookieValue(denied, ACCESS_TOKEN_COOKIE)).toBeUndefined();
    expect(cookieValue(denied, REFRESH_TOKEN_COOKIE)).toBeUndefined();
  });

  it('does not take an email that already belongs to someone else', async () => {
    app = await createApp(createFakeDelegate(), {
      google: fakeGoogle({ 'ada-token': { subject: 'google-ada', email: 'ada@example.com' } }),
    });
    const server = app.getHttpServer();

    const registered = await request(server)
      .post('/auth/register')
      .send({ email: 'ada@example.com', password: 'correct horse' })
      .expect(201);
    const ownerId = registered.body.data.id;

    const signedIn = await request(server).post('/auth/google').send({ idToken: 'ada-token' }).expect(200);
    expect(signedIn.body.data.id).not.toBe(ownerId);
    expect(signedIn.body.data.email).toBeNull();
    expect(accessClaims(signedIn).roles).toEqual([]);

    const stillAda = await request(server)
      .post('/auth/login')
      .send({ email: 'ada@example.com', password: 'correct horse' })
      .expect(200);
    expect(stillAda.body.data.id).toBe(ownerId);
  });
});
