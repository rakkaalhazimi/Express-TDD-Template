import { describe, test, expect, afterEach, vi, beforeAll } from "vitest";
import request from 'supertest';

import { initTestORM } from "@/db/db.js";
import { AuthService, createAuthService } from "@/features/auth/auth.service.js";
import { AuthProvider } from "@/features/user/entities/UserAuth.js";
import { createApp } from "@/index.js";



const microsoftLoginPayload = {
  oid: 'microsoft-user-123',
  userPrincipalName: 'user@example.com',
};

const db = await initTestORM();
const app = await createApp(db);
const authService = createAuthService(db);

describe('Microsoft Auth API - Page', () => {

  beforeAll(() => {
    vi.spyOn(AuthService.prototype, 'authorizeMicrosoft')
      .mockResolvedValue(microsoftLoginPayload as any);
  });


  test('GET microsoft auth exists', async () => {
    const res = await request(app)
      .get('/api/v1/auth/microsoft')
      .redirects(0);
    expect(res.status).equal(302);
  });


  test('GET microsoft auth callback exists', async () => {
    const res = await request(app).get('/api/v1/auth/microsoft/callback');
    expect(res.status).not.equal(404);
  });
});



describe('Microsoft Auth API - Register', () => {

  beforeAll(() => {
    vi.spyOn(AuthService.prototype, 'authorizeMicrosoft')
      .mockResolvedValue(microsoftLoginPayload as any);
  });


  afterEach(async () => {
    await db.orm.schema.clear({
      truncate: true,
      clearIdentityMap: true,
    });
  });


  test('Register new user by Microsoft', async () => {
    await request(app).get('/api/v1/auth/microsoft/callback');
    const newAuthUser = await db.userAuth.findOne({
      providerUserId: microsoftLoginPayload.oid,
      displayIdentifier: microsoftLoginPayload.userPrincipalName,
    });
    expect(newAuthUser?.providerUserId).equal(microsoftLoginPayload.oid);
    expect(newAuthUser?.provider).equal(AuthProvider.MICROSOFT);
  });


  test('Register existing user by Microsoft', async () => {
    await authService.registerByMicrosoft(microsoftLoginPayload.oid, microsoftLoginPayload.userPrincipalName);
    await request(app)
      .get('/api/v1/auth/microsoft/callback')
      .set('Accept', 'application/json');

    const userAuth = await db.userAuth.findOne({
      providerUserId: microsoftLoginPayload.oid,
      displayIdentifier: microsoftLoginPayload.userPrincipalName,
    });
    expect(userAuth?.providerUserId).equal(microsoftLoginPayload.oid);
    expect(userAuth?.provider).equal(AuthProvider.MICROSOFT);
  });


  test('JWT Token after Register/Login by Microsoft', async () => {
    const res = await request(app)
      .get('/api/v1/auth/microsoft/callback')
      .set('Accept', 'application/json');

    const userAuth = await db.userAuth.findOne({
      providerUserId: microsoftLoginPayload.oid,
      displayIdentifier: microsoftLoginPayload.userPrincipalName,
    });

    const verifyRes = await authService.verifyJWT(res.body.data.accessToken);
    expect(verifyRes.data.user_id).toBeTruthy();
    expect(verifyRes.data.user_id == userAuth?.user?.id).toBe(true);
  });

});



describe('Microsoft Auth API - Error', () => {

  beforeAll(() => {
    vi.spyOn(AuthService.prototype, 'authorizeMicrosoft')
      .mockImplementation(async () => {
        throw new TypeError('Made up error');
      });
  });


  test('Error on authorize Microsoft', async () => {
    const res = await request(app).get('/api/v1/auth/microsoft/callback');
    expect(res.status).equal(500);
  });

});
