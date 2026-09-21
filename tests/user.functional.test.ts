import { describe, expect, vi, beforeAll } from "vitest";
import request from 'supertest';

import { test } from "./auth.context.js";



const validUser = {
  id: 0,
  username: "test",
  password: "test",
  confirmPassword: "test",
};

describe('User API', () => {

  test.beforeEach(async ({ authService }) => {
    const user = await authService.register(
      validUser.username,
      validUser.password,
      validUser.confirmPassword,
    );
    validUser.id = Number(user.id);
  });


  test.afterEach(async({ clearDatabaseRow }) => {
    await clearDatabaseRow();
  });


  test('GET user me', async ({ app, authService }) => {
    const accessToken = await authService.genereateUserToken(validUser.id);
    const res = await request(app)
      .get('/api/v1/user/me')
      .set('Cookie', `access_token=${accessToken}`);
    expect(parseInt(res.body.data.id)).toBe(validUser.id);
  });

  test('GET user me without token', async ({ app }) => {
    const res = await request(app)
      .get('/api/v1/user/me');
    expect(res.status).toBe(401);
  });
});