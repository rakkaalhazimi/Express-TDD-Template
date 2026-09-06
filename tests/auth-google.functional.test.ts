import { describe, test, expect, afterEach, vi, beforeAll } from "vitest";
import request from 'supertest';

import { initTestORM } from "@/db/db.js";
import { AuthService, createAuthService } from "@/features/auth/auth.service.js";
import { createApp } from "@/index.js";



const googleLoginPayload = {
  sub: 'google-user-123',
  email: 'test@example.com',
};

// Code snippet to mock the class library
// vi.spyOn(googleAuth, 'OAuth2Client').mockImplementation(function () {
//   this.verifyIdToken = vi.fn().mockResolvedValue({
//     getPayload: () => googleLoginPayload
//   });
// });

const db = await initTestORM();
const app = await createApp(db);

describe('Google Auth API - Page', () => {
  
  beforeAll(() => {
    vi.spyOn(AuthService.prototype, 'authorizeGoogle')
      .mockResolvedValue(googleLoginPayload as any);
  });
  
  
  test('GET google auth exists', async () => {
    const res = await request(app)
      .get('/api/v1/auth/google')
      .redirects(0);
    expect(res.status).equal(302);
  });


  test('GET google auth callback exists', async () => {
    const res = await request(app).get('/api/v1/auth/google/callback');
    expect(res.status).not.equal(404);
  });
});



describe('Google Auth API - Register', () => {
  
  beforeAll(() => {
    vi.spyOn(AuthService.prototype, 'authorizeGoogle')
      .mockResolvedValue(googleLoginPayload as any);
  });
  
  
  afterEach(async () => {
    await db.orm.schema.clear({
      truncate: true,
      clearIdentityMap: true,
    });
  });
  
  
  test('Register new user by Google', async () => {
    await request(app).get('/api/v1/auth/google/callback');
    const newAuthUser = await db.userAuth.findOne({
      providerUserId: googleLoginPayload.sub,
      displayIdentifier: googleLoginPayload.email,
    });
    expect(newAuthUser?.providerUserId).equal(googleLoginPayload.sub);
  });
  
  
  test('Register existing user by Google', async () => {
    const authService = createAuthService(db);
    await authService.registerByGoogle(googleLoginPayload.sub, googleLoginPayload.email);
    const res = await request(app)
      .get('/api/v1/auth/google/callback')
      .set('Accept', 'application/json');
    expect(res.body.data.providerUserId).equal(googleLoginPayload.sub);
  });
});



describe('Google Auth API - Error', () => {
  
  beforeAll(() => {
    vi.spyOn(AuthService.prototype, 'authorizeGoogle')
      .mockImplementation(async () => {
        throw new TypeError('Made up error');
      });
  });
  
  test('Error on authorize Google', async () => {
    const res = await request(app).get('/api/v1/auth/google/callback');
    expect(res.status).equal(500);
  });
});