import 'dotenv/config';

import { defineConfig } from '@mikro-orm/core';
import { Migrator } from '@mikro-orm/migrations';
import { PostgreSqlDriver } from '@mikro-orm/postgresql';
import { SeedManager } from '@mikro-orm/seeder';

import Env from '@/env-loader.js';
import { UserSchema } from '@/features/user/entities/User.js';
import { UserAuthSchema } from '@/features/user/entities/UserAuth.js';



export default defineConfig({
  driver: PostgreSqlDriver,
  entities: [UserSchema, UserAuthSchema],
  migrations: {
    path: './dist/db/migrations', // Path to compiled migrations (used at runtime)
    pathTs: './src/db/migrations', // Path to TypeScript source migrations (used by CLI)
    snapshot: false,
  },

  clientUrl: Env.DATABASE_URL!,

  seeder: {
    pathTs: './src/db/seeders',
  },

  extensions: [Migrator, SeedManager],
});