import { describe, test, expect } from "vitest";
import request from 'supertest';

import { initTestORM } from "@/db/db.js";
import { createApp } from "@/index.js";



const db = await initTestORM();
const app = await createApp(db);

describe('Pages', () => {
  test('GET health-check', async () => {
    const res = await request(app).get('/health-check');
    expect(res.status).toEqual(200);
  });
  
  test('GET Home Page Exists', async () => {
    const res = await request(app).get('/');
    expect(res.status).toEqual(200);
  });
  
  
  test('GET Login Page Exists', async () => {
    const res = await request(app).get('/auth/login');
    expect(res.status).toEqual(200);
  });
});