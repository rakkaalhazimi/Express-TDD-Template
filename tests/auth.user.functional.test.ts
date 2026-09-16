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

const validUser2 = {
  id: 0,
  username: 'test2',
  password: 'test2',
  confirmPassword: 'test2',
}

const validUserGoogle = {
  id: 0,
  uniqueId: '123456-google',
  displayIdentifier: 'test-express-tdd',
}

const validUserAuth = {
  uniqueId: '123456',
  displayIdentifier: 'test-express-tdd',
};

const googleLoginPayload = {
  sub: 'google-user-123',
  email: 'test@example.com',
};

const oauthState = {
  state: 'test',
  userId: 0,
}


describe('Auth API - Account Binding', () => {
  
  test.beforeAll(() => {
    vi.spyOn(AuthService.prototype, 'authorizeGoogle')
      .mockResolvedValue(googleLoginPayload as any);
      
    vi.spyOn(AuthService.prototype, 'verifyOAuthState')
      .mockReturnValue(oauthState);
  });
  
  
  test.beforeEach(async ({ authService }) => {
    const user = await authService.register(
      validUser.username,
      validUser.password,
      validUser.confirmPassword
    );
    validUser.id = Number(user.id);
    oauthState.userId = Number(user.id);
    
    const gUser = await authService.registerByGoogle(
      validUserGoogle.uniqueId, validUserGoogle.displayIdentifier);
    validUserGoogle.id = Number(gUser.id);
    
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
      .send({...validUser2, id: validUserGoogle.id});  // Register with account made from google
    
    const userAuth = await db.userAuth.findOne({
      providerUserId: validUser2.username,
      provider: AuthProvider.PASSWORD,
    }, { populate: ['user'] });
    
    expect(userAuth?.user?.username).toBe(validUser2.username);
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
      .post('/api/v1/auth/google/bind')
      .send(validUserAuth);
    const userAuth = await db.userAuth.findOne(validUserAuth);
    expect(userAuth?.user?.username).toBe(validUser.username);
    expect(res.status).not.equal(404);
  });
  
  
  test('Bind github account', async ({ app, db }) => {
    const res = await request(app)
      .post('/api/v1/auth/github/bind')
      .send(validUserAuth);
    const userAuth = await db.userAuth.findOne(validUserAuth);
    expect(userAuth?.user?.username).toBe(validUser.username);
    expect(res.status).not.equal(404);
  });
  
  
  test('Bind discord account', async ({ app, db }) => {
    const res = await request(app)
      .post('/api/v1/auth/discord/bind')
      .send(validUserAuth);
    const userAuth = await db.userAuth.findOne(validUserAuth);
    expect(userAuth?.user?.username).toBe(validUser.username);
    expect(res.status).not.equal(404);
  });
  
  
  test('Bind microsoft account', async ({ app, db }) => {
    const res = await request(app)
      .post('/api/v1/auth/microsoft/bind')
      .send(validUserAuth);
    const userAuth = await db.userAuth.findOne(validUserAuth);
    expect(userAuth?.user?.username).toBe(validUser.username);
    expect(res.status).not.equal(404);
  });
  
});