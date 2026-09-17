import { test as baseTest } from 'vitest';
import type { Response } from 'supertest';

import { forkDB, initTestORM } from '@/db/db.js';
import { createAuthService } from '@/features/auth/auth.service.js';
import { createApp } from '@/index.js';



const initDB = await initTestORM();

function accessTokenCookie(res: Response) {
  const setCookies = res.headers['set-cookie'] as string[] | undefined;
  if (!setCookies) {
    return 'unknown';
  }
  const tokenCookie = setCookies?.find((cookie: string) => cookie.startsWith('access_token='));
  if (!tokenCookie) {
    return 'unknown';
  }
  const accessToken = tokenCookie.split(';')[0]?.split('=')[1];
  return accessToken;
}

export const test = baseTest
  .extend('app', async () => await createApp(initDB))
  .extend('db', () => forkDB(initDB))
  // Create auth service sharing the forked db of the current test
  .extend('authService', ({ db }) => createAuthService(db))
  .extend('accessTokenCookie', () => accessTokenCookie)
  // Truncate all rows without deleting tables
  .extend('clearDatabaseRow', ({ db }) =>
    async () => {
      await db.orm.schema.clear({
        truncate: true,
        clearIdentityMap: true,
      });
    }
  );
  