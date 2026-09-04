import { StatusCodes } from 'http-status-codes';
import type { RequiredEntityData } from '@mikro-orm/core';

import type { Services } from '@/db/db.js';
import { UserSchema, type IUser } from './entities/User.js';
import { type Response } from '@/response.js';


export class UserService {
  constructor(private db: Services) {}

  async createUser(user: RequiredEntityData<IUser>): Promise<Response> {
    const newUser = this.db.em.create(UserSchema, user);
    await this.db.em.flush();
    return {
      message: 'User has been created',
      data: newUser,
      status: StatusCodes.CREATED
    };
  }

}

export function createUserService(db: Services) {
  return new UserService(db);
}