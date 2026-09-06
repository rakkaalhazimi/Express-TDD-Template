import { randomBytes } from 'node:crypto';

import bcrypt from 'bcrypt';
import { StatusCodes } from 'http-status-codes';

import { type Response } from '@/response.js';
import { type Services } from "@/db/db.js";
import { createUserService, UserService } from '@/features/user/user.service.js';
import { AuthProvider } from '../user/entities/UserAuth.js';



class AuthService {

  private userService: UserService;

  constructor(private db: Services) {
    this.userService = createUserService(db);
  };


  async hashPassword(password: string) {
    const hash = await bcrypt.hash(password, 10);
    return hash;
  }


  async verifyPassword(plainTextPassword: string, hashedPasswordFromDb: string) {
    const isMatch = await bcrypt.compare(plainTextPassword, hashedPasswordFromDb);
    return isMatch;
  }


  async login(username: string, password: string): Promise<Response> {
    const user = await this.db.user.findOne({ username: username });
    // console.log('User found: ', user);
    if (!user) {
      return {
        message: 'User not found',
        data: null,
        status: StatusCodes.NOT_FOUND
      };
    }
    const isVerified = await this.verifyPassword(password, user.password);
    if (!isVerified) {
      return {
        message: 'Username or password is incorrect',
        data: null,
        status: StatusCodes.UNAUTHORIZED
      };
    }
    return { message: 'Login Success', data: null, status: StatusCodes.ACCEPTED };
  }


  async register(username: string, password: string, confirmPassword: string): Promise<Response> {
    if (!username || !password || !confirmPassword) {
      return {
        message: 'Missing required fields',
        data: null,
        status: StatusCodes.BAD_REQUEST
      };
    }

    if (password !== confirmPassword) {
      return {
        message: 'Passwords do not match',
        data: null,
        status: StatusCodes.BAD_REQUEST
      };
    }

    const existing = await this.db.user.findOne({ username });
    if (existing) {
      return {
        message: 'Username already exists',
        data: null,
        status: StatusCodes.CONFLICT
      };
    }

    const hashed = await this.hashPassword(password);
    const response = await this.userService.createUser({ username, password: hashed } as any);
    return response;
  }


  async generateUniqueUsername() {
    for (; ;) {
      const username = `username_${randomBytes(8).toString('base64url')}`;
      const exists = await this.db.user.findOne({ username });
      if (!exists) {
        return username;
      }
    }
  }
  
  
  async generateRandomPassword() {
    const password = randomBytes(16).toString('base64url');
    const hashed = await this.hashPassword(password);
    return hashed;
  }

  
  async loginByGoogle(uniqueId: string) {
    
  }
  
  
  async registerByGoogle(uniqueId: string, displayIdentifier: string): Promise<Response> {
    const userAuth = await this.db.userAuth.findOne({
      provider: AuthProvider.GOOGLE,
      providerUserId: uniqueId,
    });

    if (userAuth) {
      return {
        message: 'Login by Google Success',
        data: userAuth,
        status: StatusCodes.OK
      };
    }

    // Create new user
    const username = await this.generateUniqueUsername();
    const password = await this.generateRandomPassword();
    const { data: newUser } = await this.userService.createUser({ username, password });
    
    // Create new user auth
    const response = await this.userService.createUserAuth({
      user: newUser,
      provider: AuthProvider.GOOGLE,
      providerUserId: uniqueId,
      displayIdentifier,
    });
    
    return response;
  }

};


export function createAuthService(db: Services) {
  return new AuthService(db);
};