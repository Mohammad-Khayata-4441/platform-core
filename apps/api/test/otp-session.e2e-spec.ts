import { type INestApplication } from '@nestjs/common';
import { OtpService } from '@core/messaging';
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from '@core/auth';
import request, { type Response } from 'supertest';
import { createOtpSignIn, type OtpMessage, type OtpSender } from '../src/auth/otp-sign-in.js';
import { accessClaims, bearer, cookieValue, createApp, createFakeDelegate } from './session-harness.js';

/**
 * OTP sign-in through HTTP. The sender is a fake. A code is whatever that fake was asked to send.
 */
function issuedOtp(options?: { enabled?: boolean; devCode?: string; ttlMs?: number }) {
  const messages: OtpMessage[] = [];
  const sender: OtpSender = {
    async send(message) {
      messages.push(message);
    },
  };
  const enabled = options?.enabled ?? true;
  const otp = new OtpService({
    enabled,
    devCode: options?.devCode,
    ttlMs: options?.ttlMs,
    maxPerWindow: 50,
  });
  return { messages, signIn: createOtpSignIn(otp, sender, enabled) };
}

function sentCode(messages: OtpMessage[]): string {
  const message = messages[messages.length - 1];
  if (!message?.code) throw new Error('expected a sent code');
  return message.code;
}

function expectSession(res: Response): void {
  expect(res.body.status).toBe('success');
  expect(res.body.data.passwordHash).toBeUndefined();
  expect(cookieValue(res, ACCESS_TOKEN_COOKIE)).toBeTruthy();
  expect(cookieValue(res, REFRESH_TOKEN_COOKIE)).toBeTruthy();
}

describe('otp sign-in (e2e)', () => {
  let app: INestApplication;

  afterEach(async () => {
    if (app) await app.close();
  });

  it('sends one email code and signs that person in, including owner for the first user', async () => {
    const issued = issuedOtp();
    app = await createApp(createFakeDelegate(), { otp: issued.signIn });
    const server = app.getHttpServer();

    const requested = await request(server)
      .post('/auth/otp/request')
      .send({ email: 'Ada@example.com' })
      .expect(200);
    expect(requested.body.status).toBe('success');
    expect(issued.messages).toHaveLength(1);
    expect(issued.messages[0]).toMatchObject({ email: 'ada@example.com' });
    expect(issued.messages[0]?.phone).toBeUndefined();

    const wrong = await request(server)
      .post('/auth/otp/verify')
      .send({ email: 'ada@example.com', code: 'nope' })
      .expect(400);
    expect(wrong.body.status).toBe('error');
    expect(cookieValue(wrong, ACCESS_TOKEN_COOKIE)).toBeUndefined();

    const signedIn = await request(server)
      .post('/auth/otp/verify')
      .send({ email: 'ada@example.com', code: sentCode(issued.messages) })
      .expect(200);
    expectSession(signedIn);
    expect(signedIn.body.data.email).toBe('ada@example.com');
    expect(accessClaims(signedIn).roles).toEqual(['owner']);
    const userId = signedIn.body.data.id;
    if (typeof userId !== 'string') throw new Error('signed-in user is missing an id');

    const reused = await request(server)
      .post('/auth/otp/verify')
      .send({ email: 'ada@example.com', code: sentCode(issued.messages) })
      .expect(400);
    expect(reused.body.message).toMatch(/invalid or expired/i);
    expect(cookieValue(reused, ACCESS_TOKEN_COOKIE)).toBeUndefined();

    await request(server).post('/auth/otp/request').send({ email: 'ada@example.com' }).expect(200);
    const again = await request(server)
      .post('/auth/otp/verify')
      .send({ email: 'ada@example.com', code: sentCode(issued.messages) })
      .expect(200);
    expect(again.body.data.id).toBe(userId);

    await request(server).post('/auth/otp/request').send({ email: 'grace@example.com' }).expect(200);
    const grace = await request(server)
      .post('/auth/otp/verify')
      .send({ email: 'grace@example.com', code: sentCode(issued.messages) })
      .expect(200);
    expect(accessClaims(grace).roles).toEqual([]);
  });

  it('sends one phone code and signs that person in', async () => {
    const issued = issuedOtp();
    app = await createApp(createFakeDelegate(), { otp: issued.signIn });
    const server = app.getHttpServer();

    await request(server).post('/auth/otp/request').send({ phone: '+15551212008' }).expect(200);
    expect(issued.messages).toHaveLength(1);
    expect(issued.messages[0]).toMatchObject({ phone: '+15551212008' });
    expect(issued.messages[0]?.email).toBeUndefined();

    const signedIn = await request(server)
      .post('/auth/otp/verify')
      .send({ phone: '+15551212008', code: sentCode(issued.messages) })
      .expect(200);
    expectSession(signedIn);
    expect(signedIn.body.data.phone).toBe('+15551212008');
    expect(signedIn.body.data.email).toBeNull();
  });

  it('rejects an expired code and does not create a user', async () => {
    const issued = issuedOtp({ ttlMs: 0 });
    app = await createApp(createFakeDelegate(), { otp: issued.signIn });
    const server = app.getHttpServer();

    await request(server).post('/auth/otp/request').send({ email: 'ada@example.com' }).expect(200);
    const expired = await request(server)
      .post('/auth/otp/verify')
      .send({ email: 'ada@example.com', code: sentCode(issued.messages) })
      .expect(400);
    expect(expired.body.message).toMatch(/invalid or expired/i);
    expect(cookieValue(expired, ACCESS_TOKEN_COOKIE)).toBeUndefined();

    const registered = await request(server)
      .post('/auth/register')
      .send({ email: 'ada@example.com', password: 'correct horse' })
      .expect(201);
    expect(cookieValue(registered, ACCESS_TOKEN_COOKIE)).toBeTruthy();
  });

  it('accepts the dev code when delivery is off and does not call the sender', async () => {
    const issued = issuedOtp({ enabled: false, devCode: '424242' });
    app = await createApp(createFakeDelegate(), { otp: issued.signIn });
    const server = app.getHttpServer();

    const requested = await request(server)
      .post('/auth/otp/request')
      .send({ email: 'ada@example.com' })
      .expect(200);
    expect(requested.body.status).toBe('success');
    expect(issued.messages).toEqual([]);

    const signedIn = await request(server)
      .post('/auth/otp/verify')
      .send({ email: 'ada@example.com', code: '424242' })
      .expect(200);
    expectSession(signedIn);
    expect(issued.messages).toEqual([]);
  });

  it('refuses request and verify when messaging is not configured and creates no user', async () => {
    app = await createApp();
    const server = app.getHttpServer();

    const requested = await request(server)
      .post('/auth/otp/request')
      .send({ email: 'ada@example.com' })
      .expect(400);
    expect(requested.body.status).toBe('error');
    expect(requested.body.message).toMatch(/not configured/i);
    expect(cookieValue(requested, ACCESS_TOKEN_COOKIE)).toBeUndefined();

    const verified = await request(server)
      .post('/auth/otp/verify')
      .send({ email: 'ada@example.com', code: '424242' })
      .expect(400);
    expect(verified.body.message).toMatch(/not configured/i);
    expect(cookieValue(verified, REFRESH_TOKEN_COOKIE)).toBeUndefined();

    const registered = await request(server)
      .post('/auth/register')
      .send({ email: 'ada@example.com', password: 'correct horse' })
      .expect(201);
    expect(cookieValue(registered, ACCESS_TOKEN_COOKIE)).toBeTruthy();
    expect(cookieValue(registered, REFRESH_TOKEN_COOKIE)).toBeTruthy();
  });

  it('rate limits repeated OTP requests', async () => {
    const issued = issuedOtp();
    app = await createApp(createFakeDelegate(), { loginRateLimit: 2, otp: issued.signIn });
    const server = app.getHttpServer();

    await request(server).post('/auth/otp/request').send({ email: 'ada@example.com' }).expect(200);
    await request(server).post('/auth/otp/request').send({ email: 'ada@example.com' }).expect(200);
    const limited = await request(server)
      .post('/auth/otp/request')
      .send({ email: 'ada@example.com' })
      .expect(429);
    expect(limited.body.status).toBe('error');
    expect(issued.messages).toHaveLength(2);

    await request(server).post('/auth/login').send({ email: 'ada@example.com', password: 'nope' }).expect(401);
  });

  it('rate limits repeated OTP verify attempts', async () => {
    const issued = issuedOtp();
    app = await createApp(createFakeDelegate(), { loginRateLimit: 2, otp: issued.signIn });
    const server = app.getHttpServer();
    const body = { email: 'ada@example.com', code: 'nope' };

    await request(server).post('/auth/otp/verify').send(body).expect(400);
    await request(server).post('/auth/otp/verify').send(body).expect(400);
    const limited = await request(server).post('/auth/otp/verify').send(body).expect(429);
    expect(limited.body.status).toBe('error');
  });

  it('still signs in a user who has a password, and an OTP-only user has none', async () => {
    const issued = issuedOtp();
    app = await createApp(createFakeDelegate(), { otp: issued.signIn });
    const server = app.getHttpServer();

    await request(server)
      .post('/auth/register')
      .send({ email: 'ada@example.com', password: 'correct horse' })
      .expect(201);
    const login = await request(server)
      .post('/auth/login')
      .send({ email: 'ada@example.com', password: 'correct horse' })
      .expect(200);
    expectSession(login);

    await request(server).post('/auth/otp/request').send({ phone: '+15551212009' }).expect(200);
    await request(server)
      .post('/auth/otp/verify')
      .send({ phone: '+15551212009', code: sentCode(issued.messages) })
      .expect(200);
    const denied = await request(server)
      .post('/auth/login')
      .send({ phone: '+15551212009', password: 'correct horse' })
      .expect(401);
    expect(denied.body.status).toBe('error');
    expect(cookieValue(denied, ACCESS_TOKEN_COOKIE)).toBeUndefined();
  });

  it('refuses a code for a deactivated user', async () => {
    const issued = issuedOtp();
    app = await createApp(createFakeDelegate(), { otp: issued.signIn });
    const server = app.getHttpServer();

    const ada = await request(server)
      .post('/auth/register')
      .send({ email: 'ada@example.com', password: 'correct horse' })
      .expect(201);
    const grace = await request(server)
      .post('/auth/register')
      .send({ email: 'grace@example.com', password: 'correct horse' })
      .expect(201);
    const graceId = grace.body.data.id;
    if (typeof graceId !== 'string') throw new Error('registered user is missing an id');

    await request(server)
      .post(`/auth/users/${graceId}/deactivate`)
      .set('Cookie', bearer(ada, ACCESS_TOKEN_COOKIE))
      .expect(200);

    await request(server).post('/auth/otp/request').send({ email: 'grace@example.com' }).expect(200);
    const denied = await request(server)
      .post('/auth/otp/verify')
      .send({ email: 'grace@example.com', code: sentCode(issued.messages) })
      .expect(401);
    expect(denied.body.message).toMatch(/invalid or expired/i);
    expect(cookieValue(denied, ACCESS_TOKEN_COOKIE)).toBeUndefined();
  });

  it('does not let a code for one address sign in as another', async () => {
    const issued = issuedOtp();
    app = await createApp(createFakeDelegate(), { otp: issued.signIn });
    const server = app.getHttpServer();

    const both = await request(server)
      .post('/auth/otp/request')
      .send({ email: 'ada@example.com', phone: '+15551212010' })
      .expect(400);
    expect(both.body.status).toBe('error');
    expect(issued.messages).toEqual([]);

    await request(server).post('/auth/otp/request').send({ phone: '+15551212010' }).expect(200);
    const code = sentCode(issued.messages);
    const planted = await request(server)
      .post('/auth/otp/verify')
      .send({ email: 'ada@example.com', phone: '+15551212010', code })
      .expect(400);
    expect(planted.body.status).toBe('error');
    expect(cookieValue(planted, ACCESS_TOKEN_COOKIE)).toBeUndefined();
    expect(cookieValue(planted, REFRESH_TOKEN_COOKIE)).toBeUndefined();

    const registered = await request(server)
      .post('/auth/register')
      .send({ email: 'ada@example.com', password: 'correct horse' })
      .expect(201);
    const victimId = registered.body.data.id;

    const stolen = await request(server)
      .post('/auth/otp/verify')
      .send({ email: 'ada@example.com', phone: '+15551212010', code })
      .expect(400);
    expect(cookieValue(stolen, ACCESS_TOKEN_COOKIE)).toBeUndefined();
    expect(cookieValue(stolen, REFRESH_TOKEN_COOKIE)).toBeUndefined();

    const phoneUser = await request(server)
      .post('/auth/otp/verify')
      .send({ phone: '+15551212010', code })
      .expect(200);
    expect(phoneUser.body.data.id).not.toBe(victimId);
    expect(phoneUser.body.data.email).toBeNull();

    const stillAda = await request(server)
      .post('/auth/login')
      .send({ email: 'ada@example.com', password: 'correct horse' })
      .expect(200);
    expect(stillAda.body.data.id).toBe(victimId);
  });
});
