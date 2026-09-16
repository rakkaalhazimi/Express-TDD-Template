import { randomBytes } from 'node:crypto';

import bcrypt from 'bcrypt';
import type { RequiredEntityData } from '@mikro-orm/core';

import type { Services } from '@/db/db.js';
import { UserSchema, type IUser } from './entities/User.js';
import { UserAuthSchema, type IUserAuth } from './entities/UserAuth.js';



export class UserService {
  constructor(private db: Services) {}

  async generateUniqueUsername(): Promise<string> {
    for (;;) {
      const username = `username_${randomBytes(8).toString('base64url')}`;
      const exists = await this.db.user.findOne({ username });
      if (!exists) return username;
    }
  }

  async generateUniquePassword(): Promise<string> {
    const password = randomBytes(16).toString('base64url');
    const hashed = await bcrypt.hash(password, 10);
    return hashed;
  }

  async createRandomUser(): Promise<IUser> {
    const username = await this.generateUniqueUsername();
    const password = await this.generateUniquePassword();
    const newUser = await this.createUser({ username, password } as any);
    return newUser;
  }

  async createUser(user: RequiredEntityData<IUser>): Promise<IUser> {
    const newUser = this.db.em.create(UserSchema, user);
    await this.db.em.flush();
    return newUser;
  }
  
  async createUserAuth(userAuth: RequiredEntityData<IUserAuth>): Promise<IUserAuth> {
    const newUserAuth = this.db.em.create(UserAuthSchema, userAuth);
    await this.db.em.flush();
    return newUserAuth
  }

}

export function createUserService(db: Services) {
  return new UserService(db);
}