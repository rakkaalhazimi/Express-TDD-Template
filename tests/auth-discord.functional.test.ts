import { describe, expect, vi, beforeAll } from "vitest";
import request from 'supertest';

import { test } from "./auth.context.js";

import { AuthService } from "@/features/auth/auth.service.js";
import { AuthProvider, UserAuthSchema } from "@/features/user/entities/UserAuth.js";
import { verifyAccessToken } from "@/utils/auth-utils.js";



const discordLoginPayload = {
  id: '123456789',
  username: 'expressjstdd',
};

describe('Discord Auth API - Page', () => {

  test('GET discord auth exists', async ({ app }) => {
    const res = await request(app)
      .get('/api/v1/auth/discord')
      .redirects(0);
    expect(res.status).equal(302);
  });


  test('GET discord auth callback exists', async ({ app }) => {
    const res = await request(app).get('/api/v1/auth/discord/callback');
    expect(res.status).not.equal(404);
  });


  test('GET discord bind exists', async ({ app }) => {
    const res = await request(app).get('/api/v1/auth/discord-bind');
    expect(res.status).not.equal(404);
  });


  test('GET discord bind callback exists', async ({ app }) => {
    const res = await request(app).get('/api/v1/auth/discord/bind');
    expect(res.status).not.equal(404);
  });
});



describe('Discord Auth API - Register', () => {

  beforeAll(() => {
    vi.spyOn(AuthService.prototype, 'authorizeDiscord')
      .mockResolvedValue(discordLoginPayload);
  });


  test.afterEach(async ({ clearDatabaseRow }) => {
    await clearDatabaseRow();
  });


  test('Register new user by Discord', async ({ app, db }) => {
    await request(app).get('/api/v1/auth/discord/callback');
    const newAuthUser = await db.userAuth.findOne({
      providerUserId: discordLoginPayload.id,
      displayIdentifier: discordLoginPayload.username,
    });
    expect(newAuthUser?.providerUserId).equal(discordLoginPayload.id);
    expect(newAuthUser?.provider).equal(AuthProvider.DISCORD);
  });


  test('Register existing user by Discord', async ({ app, db, authService }) => {
    await authService.registerByDiscord(discordLoginPayload.id, discordLoginPayload.username);
    await request(app)
      .get('/api/v1/auth/discord/callback')
      .set('Accept', 'application/json');

    const userAuth = await db.userAuth.findOne({
      providerUserId: discordLoginPayload.id,
      displayIdentifier: discordLoginPayload.username,
    });
    expect(userAuth?.providerUserId).equal(discordLoginPayload.id);
    expect(userAuth?.provider).equal(AuthProvider.DISCORD);
  });


  test('JWT Token after Register/Login by Discord', async ({ app, db, accessTokenCookie }) => {
    const res = await request(app)
      .get('/api/v1/auth/discord/callback')
      .set('Accept', 'application/json')
      .redirects(0);
    expect(res.status).equal(302);

    const userAuth = await db.userAuth.findOne({
      providerUserId: discordLoginPayload.id,
      displayIdentifier: discordLoginPayload.username,
    });

    const accessToken = accessTokenCookie(res);
    expect(accessToken).toBeTruthy();

    const token = await verifyAccessToken(accessToken!);
    expect(token.user_id).toBeTruthy();
    expect(token.user_id == Number(userAuth?.user?.id)).toBe(true);
  });

});


describe('Discord Auth API - Bind', () => {

  const validUser = {
    username: "test",
    password: "test",
    confirmPassword: "test",
  };

  const oauthState = {
    state: 'test',
    userId: 0,
  };

  test.beforeAll(() => {
    vi.spyOn(AuthService.prototype, 'verifyOAuthState')
      .mockReturnValue(oauthState);
    vi.spyOn(AuthService.prototype, 'authorizeDiscord')
      .mockResolvedValue(discordLoginPayload);
  });


  test.beforeEach(async ({ authService }) => {
    const user = await authService.register(
      validUser.username,
      validUser.password,
      validUser.confirmPassword,
    );
    oauthState.userId = Number(user.id);
  });


  test.afterEach(async ({ clearDatabaseRow }) => {
    await clearDatabaseRow();
  });


  test.afterAll(() => {
    vi.clearAllMocks();
  });


  test('Bind discord account', async ({ app, db }) => {
    const res = await request(app)
      .get('/api/v1/auth/discord/bind');

    const userAuth = await db.userAuth.findOne({
      providerUserId: discordLoginPayload.id,
      provider: AuthProvider.DISCORD,
    }, { populate: ['user'] });

    expect(userAuth?.user?.username).toBe(validUser.username);
    expect(res.status).equal(201);
  });


  test('Bind discord account if exist', async ({ app, db, authService }) => {
    await authService.registerByDiscord(
      discordLoginPayload.id,
      discordLoginPayload.username,
    );

    const res = await request(app)
      .get('/api/v1/auth/discord/bind');

    const userAuth = await db.userAuth.find({
      providerUserId: discordLoginPayload.id,
      provider: AuthProvider.DISCORD,
    });
    expect(userAuth.length).toBeLessThan(2);
    expect(res.status).equal(409);
  });

});


describe('Discord Auth API - Unbind', () => {

  const validUser = {
    username: "test",
    password: "test",
    confirmPassword: "test",
  };

  test.afterEach(async ({ clearDatabaseRow }) => {
    await clearDatabaseRow();
  });


  test('Unbind discord account', async ({ app, db, authService }) => {
    await authService.register(
      validUser.username,
      validUser.password,
      validUser.confirmPassword,
    );
    const passwordAuth = await db.userAuth.findOne({
      providerUserId: validUser.username,
      provider: AuthProvider.PASSWORD,
    }, { populate: ['user'] });
    const userId = Number(passwordAuth!.user.id);

    db.em.create(UserAuthSchema, {
      user: passwordAuth!.user,
      provider: AuthProvider.DISCORD,
      providerUserId: discordLoginPayload.id,
      displayIdentifier: discordLoginPayload.username,
    });
    await db.em.flush();
    const accessToken = await authService.genereateUserToken(userId);

    const res = await request(app)
      .post('/api/v1/auth/discord/unbind')
      .set('Cookie', `access_token=${accessToken}`);

    const boundAuth = await db.userAuth.findOne({
      providerUserId: discordLoginPayload.id,
      provider: AuthProvider.DISCORD,
    });
    expect(boundAuth).toBeNull();
    expect(res.status).equal(200);
  });


  test('Unbind discord account if not bound', async ({ app, db, authService }) => {
    await authService.register(
      validUser.username,
      validUser.password,
      validUser.confirmPassword,
    );
    const passwordAuth = await db.userAuth.findOne({
      providerUserId: validUser.username,
      provider: AuthProvider.PASSWORD,
    }, { populate: ['user'] });
    const userId = Number(passwordAuth?.user!.id);
    const accessToken = await authService.genereateUserToken(userId);

    const res = await request(app)
      .post('/api/v1/auth/discord/unbind')
      .set('Cookie', `access_token=${accessToken}`);

    expect(res.status).equal(404);
  });
});



describe('Discord Auth API - Error', () => {

  beforeAll(() => {
    vi.spyOn(AuthService.prototype, 'authorizeDiscord')
      .mockImplementation(async () => {
        throw new TypeError('Made up error');
      });
  });


  test('Error on authorize Discord', async ({ app }) => {
    const res = await request(app).get('/api/v1/auth/discord/callback');
    expect(res.status).equal(500);
  });

});