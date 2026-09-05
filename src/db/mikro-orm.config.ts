import 'dotenv/config';

import { defineConfig } from '@mikro-orm/core';
import { Migrator } from '@mikro-orm/migrations';
import { SeedManager } from '@mikro-orm/seeder';
import { SqliteDriver } from '@mikro-orm/sqlite';
// import { PostgreSqlDriver } from '@mikro-orm/postgresql';

import Env from '@/env-loader.js';
import { UserSchema } from '@/features/user/entities/User.js';
import { UserAuthSchema } from '@/features/user/entities/UserAuth.js';


const isPostgres = process.env.DB_TYPE === 'postgres';

export default defineConfig({
  driver: SqliteDriver,
  entities: [UserSchema, UserAuthSchema],
  migrations: {
    path: './dist/db/migrations', // Path to compiled migrations (used at runtime)
    pathTs: './src/db/migrations', // Path to TypeScript source migrations (used by CLI)
    snapshot: false,
  },

  ...(isPostgres
    ? {
      clientUrl: Env.DATABASE_URL!,
    }
    : {
      dbName: Env.DB_FILE_NAME ?? 'database.sqlite',
    }
  ),
  
  seeder: {
    pathTs: './src/db/seeders'
  },
  
  extensions: [Migrator, SeedManager]
});