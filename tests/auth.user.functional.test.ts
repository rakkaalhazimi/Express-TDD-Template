import { describe, expect, vi } from "vitest";
import request from 'supertest';

import { test } from "./auth.context.js";

import { AuthService } from "@/features/auth/auth.service.js";
import { AuthProvider } from "@/features/user/entities/UserAuth.js";



const validUser = {
  id: 0,
  username: 'test',
  password: 'test',
  confirmPassword: 'test',
};

const newUser = {
  id: 0,
  username: 'test2',
  password: 'test2',
  confirmPassword: 'test2',
};

const newUserGoogle = {
  id: 0,
  uniqueId: '123456-google',
  displayIdentifier: 'test-express-tdd',
};

const googleLoginPayload = {
  sub: 'google-user-123',
  email: 'test@example.com',
};

const newUserAuthGoogle = {
  uniqueId: googleLoginPayload.sub,
  displayIdentifier: googleLoginPayload.email,
};

const newUserAuth = {
  uniqueId: '123456',
  displayIdentifier: 'test-express-tdd',
};

const oauthState = {
  state: 'test',
  userId: 0,
};


describe('Auth API - Account Binding', () => {
  
  test.beforeAll(() => {
    vi.spyOn(AuthService.prototype, 'verifyOAuthState')
      .mockReturnValue(oauthState);

    vi.spyOn(AuthService.prototype, 'authorizeGoogle')
      .mockResolvedValue(googleLoginPayload as any);
  });
  
  
  test.beforeEach(async ({ authService }) => {
    // Account with password auth, for other auth test
    const userAuth = await authService.register(
      validUser.username,
      validUser.password,
      validUser.confirmPassword
    );
    const userId = Number(userAuth.user!.id);
    validUser.id = userId;
    oauthState.userId = userId;
    
    // Account with google auth, for password auth test
    const gUserAuth = await authService.registerByGoogle(
      newUserGoogle.uniqueId, newUserGoogle.displayIdentifier);
    newUserGoogle.id = Number(gUserAuth.user!.id);
  });


  test.afterEach(async ({ db }) => {
    // Truncate all rows without deleting tables
    await db.orm.schema.clear({
      truncate: true,
      clearIdentityMap: true,
    });
  });
  
  
  test.afterAll(() => {
    vi.clearAllMocks();
  });
  
  
  test('Bind password account', async ({ app, db }) => {
    const res = await request(app)
      .post('/api/v1/auth/password/bind')
      .send({...newUser, id: newUserGoogle.id});  // Register with account made from google
    
    const userAuth = await db.userAuth.findOne({
      providerUserId: newUser.username,
      provider: AuthProvider.PASSWORD,
    }, { populate: ['user'] });
    
    expect(userAuth?.user?.username).toBe(newUser.username);
    expect(res.status).equal(201);
  });
  
  
  test('Bind password account if exist', async ({ app, db }) => {
    const res = await request(app)
      .post('/api/v1/auth/password/bind')
      .send(validUser);

    const foundUserAuth = await db.userAuth.find({
      providerUserId: validUser.username,
      provider: AuthProvider.PASSWORD,
    });

    expect(foundUserAuth.length).toBeLessThan(2);
    expect(res.status).equal(409);
  });
  

  test('Bind google account', async ({ app, db }) => {
    const res = await request(app)
      .get('/api/v1/auth/google/bind');
    
    const userAuth = await db.userAuth.findOne({
      providerUserId: googleLoginPayload.sub,
      provider: AuthProvider.GOOGLE,
    }, { populate: ['user'] });
    console.log('User auth: ', userAuth);
    
    expect(userAuth?.user?.username).toBe(validUser.username);
    expect(res.status).equal(201);
  });
  
  
  test('Bind google account if exist', async ({ app, db, authService }) => {
    await authService.registerByGoogle(
      googleLoginPayload.sub, 
      googleLoginPayload.email,
    );
    
    const res = await request(app)
      .get('/api/v1/auth/google/bind');
    
    const userAuth = await db.userAuth.find({
      providerUserId: googleLoginPayload.sub,
      provider: AuthProvider.GOOGLE,
    });
    expect(userAuth.length).toBeLessThan(2);
    expect(res.status).equal(409);
  });
  
  
  test('Bind github account', async ({ app, db }) => {
    const res = await request(app)
      .get('/api/v1/auth/github/bind')
      .send({...newUserAuth, id: validUser.id});
    
    const userAuth = await db.userAuth.findOne({
      providerUserId: newUserAuth.uniqueId,
      provider: AuthProvider.GITHUB,
    }, { populate: ['user'] });
    
    expect(userAuth?.user?.username).toBe(validUser.username);
    expect(res.status).equal(201);
  });
  
  
  test('Bind github account if exist', async ({ app, db, authService }) => {
    await authService.registerByGithub(
      newUserAuth.uniqueId, 
      newUserAuth.displayIdentifier,
    );
    const res = await request(app)
      .get('/api/v1/auth/github/bind')
      .send({...newUserAuth, id: validUser.id});
    
    const userAuth = await db.userAuth.find({
      providerUserId: newUserAuthGoogle.uniqueId,
      provider: AuthProvider.GITHUB,
    });
    
    expect(userAuth.length).toBeLessThan(2);
    expect(res.status).equal(409);
  });
  
  
  test('Bind discord account', async ({ app, db }) => {
    const res = await request(app)
      .get('/api/v1/auth/discord/bind')
      .send(newUserAuth);
    const userAuth = await db.userAuth.findOne(newUserAuth);
    expect(userAuth?.user?.username).toBe(validUser.username);
    expect(res.status).not.equal(404);
  });
  
  
  test('Bind microsoft account', async ({ app, db }) => {
    const res = await request(app)
      .get('/api/v1/auth/microsoft/bind')
      .send(newUserAuth);
    const userAuth = await db.userAuth.findOne(newUserAuth);
    expect(userAuth?.user?.username).toBe(validUser.username);
    expect(res.status).not.equal(404);
  });
  
});