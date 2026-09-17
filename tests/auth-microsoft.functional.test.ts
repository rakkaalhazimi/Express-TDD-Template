import { describe, expect, vi, beforeAll } from "vitest";
import request from 'supertest';

import { test } from "./auth.context.js";

import { AuthService } from "@/features/auth/auth.service.js";
import { AuthProvider } from "@/features/user/entities/UserAuth.js";



const microsoftLoginPayload = {
  oid: 'microsoft-user-123',
  userPrincipalName: 'user@example.com',
};

describe('Microsoft Auth API - Page', () => {

  test('GET microsoft auth exists', async ({ app }) => {
    const res = await request(app)
      .get('/api/v1/auth/microsoft')
      .redirects(0);
    expect(res.status).equal(302);
  });


  test('GET microsoft auth callback exists', async ({ app }) => {
    const res = await request(app).get('/api/v1/auth/microsoft/callback');
    expect(res.status).not.equal(404);
  });
});



describe('Microsoft Auth API - Register', () => {

  beforeAll(() => {
    vi.spyOn(AuthService.prototype, 'authorizeMicrosoft')
      .mockResolvedValue(microsoftLoginPayload as any);
  });


  test.afterEach(async ({ db }) => {
    await db.orm.schema.clear({
      truncate: true,
      clearIdentityMap: true,
    });
  });


  test('Register new user by Microsoft', async ({ app, db }) => {
    await request(app).get('/api/v1/auth/microsoft/callback');
    const newAuthUser = await db.userAuth.findOne({
      providerUserId: microsoftLoginPayload.oid,
      displayIdentifier: microsoftLoginPayload.userPrincipalName,
    });
    expect(newAuthUser?.providerUserId).equal(microsoftLoginPayload.oid);
    expect(newAuthUser?.provider).equal(AuthProvider.MICROSOFT);
  });


  test('Register existing user by Microsoft', async ({ app, db, authService }) => {
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


  test('JWT Token after Register/Login by Microsoft', async ({ app, db, authService, accessTokenCookie }) => {
    const res = await request(app)
      .get('/api/v1/auth/microsoft/callback')
      .set('Accept', 'application/json')
      .redirects(0);
    expect(res.status).equal(302);

    const userAuth = await db.userAuth.findOne({
      providerUserId: microsoftLoginPayload.oid,
      displayIdentifier: microsoftLoginPayload.userPrincipalName,
    });

    const accessToken = accessTokenCookie(res);
    expect(accessToken).toBeTruthy();

    const token = await authService.verifyJWT(accessToken!);
    expect(token.user_id).toBeTruthy();
    expect(token.user_id == Number(userAuth?.user?.id)).toBe(true);
  });

});



describe('Microsoft Auth API - Error', () => {

  beforeAll(() => {
    vi.spyOn(AuthService.prototype, 'authorizeMicrosoft')
      .mockImplementation(async () => {
        throw new TypeError('Made up error');
      });
  });


  test('Error on authorize Microsoft', async ({ app }) => {
    const res = await request(app).get('/api/v1/auth/microsoft/callback');
    expect(res.status).equal(500);
  });

});
