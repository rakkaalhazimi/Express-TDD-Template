import { describe, expect, vi, beforeAll } from "vitest";
import request from 'supertest';

import { test } from "./auth.context.js";

import { AuthService } from "@/features/auth/auth.service.js";
import { AuthProvider } from "@/features/user/entities/UserAuth.js";



const githubLoginPayload = {
  id: '123456789',
  login: 'expressjstdd',
};


describe('Github Auth API - Page', () => {

  beforeAll(() => {
    vi.spyOn(AuthService.prototype, 'authorizeGoogle')
      .mockResolvedValue(githubLoginPayload as any);
  });


  test('GET github auth exists', async ({ app }) => {
    const res = await request(app)
      .get('/api/v1/auth/github')
      .redirects(0);
    expect(res.status).equal(302);
  });


  test('GET github auth callback exists', async ({ app }) => {
    const res = await request(app).get('/api/v1/auth/github/callback');
    expect(res.status).not.equal(404);
  });
});



describe('Github Auth API - Register', () => {

  beforeAll(() => {
    vi.spyOn(AuthService.prototype, 'authorizeGithub')
      .mockResolvedValue(githubLoginPayload as any);
  });


  test.afterEach(async ({ db }) => {
    await db.orm.schema.clear({
      truncate: true,
      clearIdentityMap: true,
    });
  });


  test('Register new user by Github', async ({ app, db }) => {
    await request(app).get('/api/v1/auth/github/callback');
    const newAuthUser = await db.userAuth.findOne({
      providerUserId: githubLoginPayload.id,
      displayIdentifier: githubLoginPayload.login,
    });
    expect(newAuthUser?.providerUserId).equal(githubLoginPayload.id);
    expect(newAuthUser?.provider).equal(AuthProvider.GITHUB);
  });


  test('Register existing user by Github', async ({ app, db, authService }) => {
    await authService.registerByGithub(githubLoginPayload.id, githubLoginPayload.login);
    await request(app)
      .get('/api/v1/auth/github/callback')
      .set('Accept', 'application/json');
      
    const userAuth = await db.userAuth.findOne({ 
      providerUserId: githubLoginPayload.id,
      displayIdentifier: githubLoginPayload.login,
    });
    expect(userAuth?.providerUserId).equal(githubLoginPayload.id);
    expect(userAuth?.provider).equal(AuthProvider.GITHUB);
  });
  
  
  test('JWT Token after Register/Login by Github', async ({ app, db, authService, accessTokenCookie }) => {
    const res = await request(app)
      .get('/api/v1/auth/github/callback')
      .set('Accept', 'application/json')
      .redirects(0);
    expect(res.status).equal(302);

    const userAuth = await db.userAuth.findOne({
      providerUserId: githubLoginPayload.id,
      displayIdentifier: githubLoginPayload.login,
    });

    const accessToken = accessTokenCookie(res);
    expect(accessToken).toBeTruthy();

    const token = await authService.verifyJWT(accessToken!);
    expect(token.user_id).toBeTruthy();
    expect(token.user_id == Number(userAuth?.user?.id)).toBe(true);
  });

});



describe('Github Auth API - Error', () => {

  beforeAll(() => {
    vi.spyOn(AuthService.prototype, 'authorizeGithub')
      .mockImplementation(async () => {
        throw new TypeError('Made up error');
      });
  });


  test('Error on authorize Github', async ({ app }) => {
    const res = await request(app).get('/api/v1/auth/github/callback');
    expect(res.status).equal(500);
  });

});