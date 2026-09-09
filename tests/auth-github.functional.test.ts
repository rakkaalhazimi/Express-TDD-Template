import { describe, test, expect, afterEach, vi, beforeAll } from "vitest";
import request from 'supertest';

import { initTestORM } from "@/db/db.js";
import { AuthService, createAuthService } from "@/features/auth/auth.service.js";
import { AuthProvider } from "@/features/user/entities/UserAuth.js";
import { createApp } from "@/index.js";



const githubLoginPayload = {
  id: '123456789',
  login: 'expressjstdd',
};

const db = await initTestORM();
const app = await createApp(db);
const authService = createAuthService(db);


describe('Github Auth API - Page', () => {

  beforeAll(() => {
    vi.spyOn(AuthService.prototype, 'authorizeGoogle')
      .mockResolvedValue(githubLoginPayload as any);
  });


  test('GET github auth exists', async () => {
    const res = await request(app)
      .get('/api/v1/auth/github')
      .redirects(0);
    expect(res.status).equal(302);
  });


  test('GET github auth callback exists', async () => {
    const res = await request(app).get('/api/v1/auth/github/callback');
    expect(res.status).not.equal(404);
  });
});



describe('Github Auth API - Register', () => {

  beforeAll(() => {
    vi.spyOn(AuthService.prototype, 'authorizeGithub')
      .mockResolvedValue(githubLoginPayload as any);
  });


  afterEach(async () => {
    await db.orm.schema.clear({
      truncate: true,
      clearIdentityMap: true,
    });
  });


  test('Register new user by Github', async () => {
    await request(app).get('/api/v1/auth/github/callback');
    const newAuthUser = await db.userAuth.findOne({
      providerUserId: githubLoginPayload.id,
      displayIdentifier: githubLoginPayload.login,
    });
    expect(newAuthUser?.providerUserId).equal(githubLoginPayload.id);
    expect(newAuthUser?.provider).equal(AuthProvider.GITHUB);
  });


  test('Register existing user by Github', async () => {
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
  
  
  test('JWT Token after Register/Login by Github', async () => {
    const res = await request(app)
      .get('/api/v1/auth/github/callback')
      .set('Accept', 'application/json');
      
    const userAuth = await db.userAuth.findOne({ 
      providerUserId: githubLoginPayload.id,
      displayIdentifier: githubLoginPayload.login,
    });
    
    const verifyRes = await authService.verifyJWT(res.body.data.accessToken);
    expect(verifyRes.data.user_id).toBeTruthy();
    expect(verifyRes.data.user_id == userAuth?.user?.id).toBe(true);
  });

});



describe('Github Auth API - Error', () => {

  beforeAll(() => {
    vi.spyOn(AuthService.prototype, 'authorizeGithub')
      .mockImplementation(async () => {
        throw new TypeError('Made up error');
      });
  });


  test('Error on authorize Github', async () => {
    const res = await request(app).get('/api/v1/auth/github/callback');
    expect(res.status).equal(500);
  });

});