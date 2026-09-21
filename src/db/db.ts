import { EntityManager, EntityRepository, MikroORM, type Options } from '@mikro-orm/core';

import { UserSchema, type IUser } from '@/features/user/entities/User.js';
import { UserAuthSchema, type IUserAuth } from '@/features/user/entities/UserAuth.js';
import config from './mikro-orm.config.js';
import { SqliteDriver } from '@mikro-orm/sqlite';



export interface Services {
  orm: MikroORM;
  em: EntityManager;
  user: EntityRepository<IUser>;
  userAuth: EntityRepository<IUserAuth>;
}

let cache: Services;

export async function initORM(options?: Partial<Options>): Promise<Services> {
  if (cache) {
    return cache;
  }

  const orm = await MikroORM.init({
    ...config,
    ...options,
  });

  // save to cache before returning
  return cache = {
    orm,
    em: orm.em,
    user: orm.em.getRepository(UserSchema),
    userAuth: orm.em.getRepository(UserAuthSchema),
  };
}

export async function initTestORM() {
  const db = await initORM({
    allowGlobalContext: true,  // for test only, to prevent using .fork() for EntityManager
    driver: SqliteDriver,
    dbName: ':memory:',
  });
  await db.orm.schema.create();  // Create database tables
  return db;
}

export function forkDB(db: Services) {
  const em = db.em.fork();
  return {
    orm: db.orm,
    em: db.em.fork(),
    user: em.getRepository(UserSchema),
    userAuth: em.getRepository(UserAuthSchema),
  };
}