import { describe, test, expect, afterEach, vi, beforeAll } from "vitest";
import request from 'supertest';

import { initTestORM } from "@/db/db.js";
import { AuthService, createAuthService } from "@/features/auth/auth.service.js";
import { AuthProvider } from "@/features/user/entities/UserAuth.js";
import { createApp } from "@/index.js";



const discordLoginPayload = {
  id: '123456789',
  username: 'expressjstdd',
};

const db = await initTestORM();
const app = await createApp(db);

describe('Discord Auth API - Page', () => {

  beforeAll(() => {
    vi.spyOn(AuthService.prototype, 'authorizeDiscord')
      .mockResolvedValue(discordLoginPayload as any);
  });


  test('GET discord auth exists', async () => {
    const res = await request(app)
      .get('/api/v1/auth/discord')
      .redirects(0);
    expect(res.status).equal(302);
  });


  test('GET discord auth callback exists', async () => {
    const res = await request(app).get('/api/v1/auth/discord/callback');
    expect(res.status).not.equal(404);
  });
});



describe('Discord Auth API - Register', () => {

  beforeAll(() => {
    vi.spyOn(AuthService.prototype, 'authorizeDiscord')
      .mockResolvedValue(discordLoginPayload as any);
  });


  afterEach(async () => {
    await db.orm.schema.clear({
      truncate: true,
      clearIdentityMap: true,
    });
  });


  test('Register new user by Discord', async () => {
    await request(app).get('/api/v1/auth/discord/callback');
    const newAuthUser = await db.userAuth.findOne({
      providerUserId: discordLoginPayload.id,
      displayIdentifier: discordLoginPayload.username,
    });
    expect(newAuthUser?.providerUserId).equal(discordLoginPayload.id);
    expect(newAuthUser?.provider).equal(AuthProvider.DISCORD);
  });


  test('Register existing user by Discord', async () => {
    const authService = createAuthService(db);
    await authService.registerByGithub(discordLoginPayload.id, discordLoginPayload.username);
    const res = await request(app)
      .get('/api/v1/auth/discord/callback')
      .set('Accept', 'application/json');
    expect(res.body.data.providerUserId).equal(discordLoginPayload.id);
    expect(res.body.data.provider).equal(AuthProvider.DISCORD);
  });

});



describe('Discord Auth API - Error', () => {

  beforeAll(() => {
    vi.spyOn(AuthService.prototype, 'authorizeDiscord')
      .mockImplementation(async () => {
        throw new TypeError('Made up error');
      });
  });


  test('Error on authorize Discord', async () => {
    const res = await request(app).get('/api/v1/auth/discord/callback');
    expect(res.status).equal(500);
  });

});