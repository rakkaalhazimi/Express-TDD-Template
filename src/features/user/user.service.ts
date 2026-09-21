import { randomBytes } from 'node:crypto';

import bcrypt from 'bcrypt';
import { serialize, type RequiredEntityData } from '@mikro-orm/core';
import { StatusCodes } from 'http-status-codes';

import type { Services } from '@/db/db.js';
import { AppError } from '@/error.js';
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
    const newUser = await this.createUser({ username, password } as RequiredEntityData<IUser>);
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
    return newUserAuth;
  }

  async findUserById(id: number): Promise<IUser> {
    const user = await this.db.user.findOne({ id });
    console.log('EM id: ', this.db.em.id);
    if (!user) {
      throw new AppError({
        status: StatusCodes.NOT_FOUND,
        message: 'User is not found',
      });
    }
    return serialize(user);
  }

  async removeUserAuth(id: number): Promise<IUserAuth> {
    const userAuth = await this.db.userAuth.findOne({ id });
    if (!userAuth) {
      throw new AppError({
        status: StatusCodes.NOT_FOUND,
        message: 'User auth is not found',
      });
    }
    await this.db.em.remove(userAuth);
    await this.db.em.flush();
    return userAuth;
  }

}

export function createUserService(db: Services) {
  return new UserService(db);
}