import { test as baseTest } from 'vitest';

import { forkDB, initTestORM } from '@/db/db.js';
import { createAuthService } from '@/features/auth/auth.service.js';
import { createApp } from '@/index.js';



const initDB = await initTestORM();

export const test = baseTest
  .extend('app', async () => await createApp(initDB))
  .extend('db', () => forkDB(initDB))
  // Create auth service with forked db
  .extend('authService', () => createAuthService(forkDB(initDB)));
  
  