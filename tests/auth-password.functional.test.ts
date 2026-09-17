import { describe, expect } from "vitest";
import request from 'supertest';

import { test } from "./auth.context.js";

import { AuthProvider } from "@/features/user/entities/UserAuth.js";



const validUser = {
  username: "test",
  password: "test",
  confirmPassword: "test"
};

const invalidUser = {
  username: "wrong-user",
  password: "wrong-pass",
  confirmPassword: "wrong-pass"
};

const newUser = {
  username: "new-user",
  password: "new-pass",
  confirmPassword: "new-pass"
};


describe('Password Auth API - Page', () => {
  test('POST Login Exists', async ({ app }) => {
    const res = await request(app)
      .post('/auth/login')
      .send(validUser);
    expect(res.status).not.equal(404);
  });
  
  
  test('POST Register Exists', async ({ app }) => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send(newUser);
    expect(res.status).not.equal(404);
  });
});


describe('Password Auth API - Login/Register', () => {
  
  test.beforeEach(async ({ authService }) => {
    // Insert valid user to database
    await authService.register(
      validUser.username, 
      validUser.password, 
      validUser.confirmPassword
    );
  });
  
  
  test.afterEach(async ({ db }) => {
    // Truncate all rows without deleting tables
    await db.orm.schema.clear({
      truncate: true,
      clearIdentityMap: true,
    });
  });
  
  
  test('POST Login with wrong username', async ({ app }) => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        username: invalidUser.username, 
        password: validUser.password
      });
    expect(res.status).toEqual(404);
  });
  
  
  test('POST Login with wrong password', async ({ app }) => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        username: validUser.username, 
        password: invalidUser.password
      });
    expect(res.status).toEqual(401);
  });
  
  
  test('POST Login with correct username and password', async ({ app }) => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send(validUser);
    expect(res.status).toEqual(200);
  });
  
  
  test('POST Register with username that already exists', async ({ app }) => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send(validUser);
    expect(res.status).equal(409);
  });
  
  
  test('POST Register with unmatched password', async ({ app }) => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        username: newUser.username, 
        password: newUser.password, 
        confirmPassword: invalidUser.confirmPassword
      });
    expect(res.status).equal(400);
  });
  
  
  test('POST Register with matched password', async ({ app }) => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send(newUser);
    expect(res.status).equal(201);
    expect(res.body.data.providerUserId).equal(newUser.username);
    expect(res.body.data.provider).equal(AuthProvider.PASSWORD);
  });
});