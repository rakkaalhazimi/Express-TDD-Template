import { describe, expect } from "vitest";
import request from 'supertest';

import { test } from "./auth.context.js";


describe('Pages', () => {
  test('GET health-check', async ({ app }) => {
    const res = await request(app).get('/health-check');
    expect(res.status).toEqual(200);
  });
  
  test('GET Home Page Exists', async ({ app }) => {
    const res = await request(app).get('/');
    expect(res.status).toEqual(200);
  });
  
  
  test('GET Login Page Exists', async ({ app }) => {
    const res = await request(app).get('/auth/login');
    expect(res.status).toEqual(200);
  });
});