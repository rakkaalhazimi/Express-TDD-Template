import { randomBytes } from 'node:crypto';

import { ConfidentialClientApplication } from '@azure/msal-node';
import bcrypt from 'bcrypt';
import type { Request } from 'express';
import { OAuth2Client } from 'google-auth-library';
import { StatusCodes } from 'http-status-codes';
import jwt from 'jsonwebtoken';

import { type Services } from "@/db/db.js";
import Env from '@/env-loader.js';
import { handleError } from '@/error.js';
import type { IUser } from '@/features/user/entities/User.js';
import { AuthProvider } from '@/features/user/entities/UserAuth.js';
import { createUserService, UserService } from '@/features/user/user.service.js';
import { type Response } from '@/response.js';



export class AuthService {

  private userService: UserService;
  private client: OAuth2Client;
  private msClient: ConfidentialClientApplication;

  constructor(private db: Services) {
    this.userService = createUserService(db);
    this.client = new OAuth2Client(Env.GOOGLE_CLIENT_ID);
    this.msClient = new ConfidentialClientApplication({
      auth: {
        clientId: Env.MICROSOFT_CLIENT_ID!,
        authority: `https://login.microsoftonline.com/common/`, // Personal Account
        clientSecret: Env.MICROSOFT_CLIENT_SECRET!,
      },
    });
  }
  


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
    return { message: 'Login Success', data: user, status: StatusCodes.ACCEPTED };
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
    const { data: newUser } = await this.userService.createUser({ username, password: hashed } as any);
    
    // Create new user auth
    const response = await this.userService.createUserAuth({
      user: newUser,
      provider: AuthProvider.PASSWORD,
      providerUserId: `${newUser.id}-${newUser.username}`,
      displayIdentifier: newUser.username,
    });
    
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


  async authorizeGoogle(req: Request) {
    const { code } = req.query;
    const authResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        client_id: Env.GOOGLE_CLIENT_ID,
        client_secret: Env.GOOGLE_CLIENT_SECRET,
        code,
        redirect_uri: Env.GOOGLE_REDIRECT_URI,
        grant_type: 'authorization_code',
      })
    });

    const { id_token } = await authResponse.json();
    const ticket = await this.client.verifyIdToken({
      idToken: id_token,
      audience: Env.GOOGLE_CLIENT_ID!
    });
    const payload = ticket.getPayload()!;
    return payload;
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


  async authorizeGithub(req: Request) {
    const { code } = req.query;
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        client_id: Env.GITHUB_CLIENT_ID,
        client_secret: Env.GITHUB_CLIENT_SECRET,
        code,
        redirect_uri: Env.GITHUB_REDIRECT_URI,
      })
    });

    const tokenJson = await tokenResponse.json();
    const accessToken = tokenJson.access_token;
    if (!accessToken) {
      throw new Error('Failed to obtain GitHub access token');
    }

    const userResponse = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `token ${accessToken}`,
        'Accept': 'application/vnd.github+json',
        'User-Agent': 'express-js-tdd'
      }
    });

    const userJson = await userResponse.json();
    return userJson;
  }


  async registerByGithub(uniqueId: string, displayIdentifier: string): Promise<Response> {
    const userAuth = await this.db.userAuth.findOne({
      provider: AuthProvider.GITHUB,
      providerUserId: uniqueId,
    });

    if (userAuth) {
      return {
        message: 'Login by Github Success',
        data: userAuth,
        status: StatusCodes.OK
      };
    }

    // Create new user
    const username = await this.generateUniqueUsername();
    const password = await this.generateRandomPassword();
    const { data: newUser } = await this.userService.createUser({ username, password } as any);

    // Create new user auth
    const response = await this.userService.createUserAuth({
      user: newUser,
      provider: AuthProvider.GITHUB,
      providerUserId: uniqueId,
      displayIdentifier,
    });

    return response;
  }


  async authorizeDiscord(req: Request) {
    const { code } = req.query;
    
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code: String(code),
      redirect_uri: Env.DISCORD_REDIRECT_URI!,
    });

    const credential = Buffer
      .from(`${Env.DISCORD_CLIENT_ID}:${Env.DISCORD_CLIENT_SECRET}`)
      .toString('base64');

    const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credential}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body
    });

    const tokenJson = await tokenResponse.json();
    const accessToken = tokenJson.access_token;
    if (!accessToken) {
      throw new Error('Failed to obtain Discord access token');
    }

    const userResponse = await fetch('https://discord.com/api/users/@me', {
      headers: { 
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
      }
    });

    const userJson = await userResponse.json();
    return userJson;
  }
  
  
  async registerByDiscord(uniqueId: string, displayIdentifier: string): Promise<Response> {
    const userAuth = await this.db.userAuth.findOne({
      provider: AuthProvider.DISCORD,
      providerUserId: uniqueId,
    });

    if (userAuth) {
      return {
        message: 'Login by Discord Success',
        data: userAuth,
        status: StatusCodes.OK
      };
    }

    // Create new user
    const username = await this.generateUniqueUsername();
    const password = await this.generateRandomPassword();
    const { data: newUser } = await this.userService.createUser({ username, password } as any);

    // Create new user auth
    const response = await this.userService.createUserAuth({
      user: newUser,
      provider: AuthProvider.DISCORD,
      providerUserId: uniqueId,
      displayIdentifier,
    });

    return response;
  }
  
  
  async getMSAuthUrl() {
    return await this.msClient.getAuthCodeUrl({
      scopes: ['user.read', 'openid', 'profile', 'email'],
      redirectUri: Env.MICROSOFT_REDIRECT_URI!,
    });
  }
  
  
  async authorizeMicrosoft(req: Request) {
    const { code } = req.query;
    
    const tokenResponse = await this.msClient.acquireTokenByCode({
      code: String(code),
      scopes: ['user.read', 'openid', 'profile', 'email'],
      redirectUri: Env.MICROSOFT_REDIRECT_URI!,
    });

    const accessToken = tokenResponse.accessToken;
    if (!accessToken) {
      throw new Error('Failed to obtain Microsoft access token');
    }

    const userResponse = await fetch('https://graph.microsoft.com/v1.0/me', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json',
      }
    });

    const userJson = await userResponse.json();
    return userJson;
  }


  async registerByMicrosoft(uniqueId: string, displayIdentifier: string): Promise<Response> {
    const userAuth = await this.db.userAuth.findOne({
      provider: AuthProvider.MICROSOFT,
      providerUserId: uniqueId,
    });

    if (userAuth) {
      return {
        message: 'Login by Microsoft Success',
        data: userAuth,
        status: StatusCodes.OK
      };
    }

    // Create new user
    const username = await this.generateUniqueUsername();
    const password = await this.generateRandomPassword();
    const { data: newUser } = await this.userService.createUser({ username, password } as any);

    // Create new user auth
    const response = await this.userService.createUserAuth({
      user: newUser,
      provider: AuthProvider.MICROSOFT,
      providerUserId: uniqueId,
      displayIdentifier,
    });

    return response;
  }
  
  
  createJWT(user: IUser) {
    const payload = {user_id: Number(user.id)};
    const token = jwt.sign(payload, Env.SECRET!, { expiresIn: '5m' });
    return token;
  }
  
  
  async verifyJWT(token: string): Promise<Response> {
    try {
      const decoded = jwt.verify(token, Env.SECRET!);
      return {
        message: 'JWT is valid',
        data: decoded,
        status: StatusCodes.OK,
      }
    } catch(e) {
      const response = handleError(e, 'Failed to verify JWT', StatusCodes.UNAUTHORIZED);
      return response;
    }
  }
  
  
  async genereateUserToken(id: number): Promise<Response> {
    const user = await this.db.user.findOne({ id });
    if (!user) {
      return {
        message: 'User not found',
        data: null,
        status: StatusCodes.NOT_FOUND,
      };
    }
    const accessToken = this.createJWT(user);

    return {
      message: 'Login success',
      data: { accessToken },
      status: StatusCodes.OK,
    };
  }
};




export function createAuthService(db: Services) {
  return new AuthService(db);
};