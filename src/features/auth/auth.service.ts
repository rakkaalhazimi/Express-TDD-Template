import { randomUUID } from 'node:crypto';

import { ConfidentialClientApplication } from '@azure/msal-node';
import bcrypt from 'bcrypt';
import type { Request, Response } from 'express';
import { OAuth2Client } from 'google-auth-library';
import { StatusCodes } from 'http-status-codes';
import jwt, { type JwtPayload } from 'jsonwebtoken';

import { type Services } from "@/db/db.js";
import Env from '@/env-loader.js';
import { AppError } from '@/error.js';
import type { OAuthBindState, TokenPayload } from './auth.dto.js';
import { UserSchema, type IUser } from '@/features/user/entities/User.js';
import { AuthProvider, type IUserAuth } from '@/features/user/entities/UserAuth.js';
import { createUserService, UserService } from '@/features/user/user.service.js';



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


  async login(username: string, password: string): Promise<IUser> {
    const user = await this.db.user.findOne({ username: username });
    if (!user) {
      throw new AppError({
        status: StatusCodes.NOT_FOUND,
        message: 'User not found',
      });
    }
    const isVerified = await this.verifyPassword(password, user.password);
    if (!isVerified) {
      throw new AppError({
        status: StatusCodes.UNAUTHORIZED, 
        message: 'Username or password is incorrect',
      });
    }
    return user;
  }


  async register(username: string, password: string, confirmPassword: string): Promise<IUserAuth> {
    if (!username || !password || !confirmPassword) {
      const missingPiece = [];
      if (!username) missingPiece.push('username');
      if (!password) missingPiece.push('password');
      if (!confirmPassword) missingPiece.push('confirmPassword');
      
      throw new AppError({
        status: StatusCodes.BAD_REQUEST,
        message: `Missing required fields`,
      });
    }

    if (password !== confirmPassword) {
      throw new AppError({
        status: StatusCodes.BAD_REQUEST,
        message: 'Passwords do not match',
      });
    }

    const existing = await this.db.user.findOne({ username });
    if (existing) {
      throw new AppError({
        status: StatusCodes.CONFLICT,
        message: 'Username already exists',
      });
    }

    const hashed = await this.hashPassword(password);
    const newUser = await this.userService.createUser({ username, password: hashed });
    
    // Create new user auth
    const userAuth = await this.userService.createUserAuth({
      user: newUser,
      provider: AuthProvider.PASSWORD,
      providerUserId: newUser.username,
      displayIdentifier: newUser.username,
    });
    
    return userAuth;
  }


  async bindPasswordAccount(
    userId: number, 
    username: string, 
    password: string, 
    confirmPassword: string
  ): Promise<IUserAuth> {
    
    if (!username || !password || !confirmPassword) {
      const missingPiece = [];
      if (!username) missingPiece.push('username');
      if (!password) missingPiece.push('password');
      if (!confirmPassword) missingPiece.push('confirmPassword');
      
      throw new AppError({
        status: StatusCodes.BAD_REQUEST,
        message: `Missing required fields`,
      });
    }

    if (password !== confirmPassword) {
      throw new AppError({
        status: StatusCodes.BAD_REQUEST,
        message: 'Passwords do not match',
      });
    }
    
    const user = await this.db.user.findOne({ id: userId });
    if (!user) {
      throw new AppError({
        status: StatusCodes.NOT_FOUND,
        message: 'User not found',
      });
    }
    
    const userAuth = await this.db.userAuth.findOne({ 
      providerUserId: username, 
      provider: AuthProvider.PASSWORD 
    });
    if (userAuth) {
      throw new AppError({
        status: StatusCodes.CONFLICT,
        message: 'User auth already exist',
      });
    }
    
    // Renew username and password
    const hashed = await this.hashPassword(password);
    user.username = username;
    user.password = hashed;
    await this.db.em.flush();
    
    const newUserAuth = await this.userService.createUserAuth({
      user: user,
      provider: AuthProvider.PASSWORD,
      providerUserId: username,
      displayIdentifier: username,
    });
    
    return newUserAuth;
  }
  
  
  createGoogleOAuthUrl(redirectUri: string, state: string = '') {
    const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    url.search = new URLSearchParams({
      client_id: Env.GOOGLE_CLIENT_ID!,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      state,
    }).toString();
    return url.toString();
  }
  
  
  async authorizeGoogle(req: Request, redirectUri: string) {
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
        redirect_uri: redirectUri,
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


  async registerByGoogle(uniqueId: string, displayIdentifier: string): Promise<IUserAuth> {
    const userAuth = await this.db.userAuth.findOne({
      provider: AuthProvider.GOOGLE,
      providerUserId: uniqueId,
    });

    if (userAuth) {
      return userAuth;
    }

    // Create new user
    const newUser = await this.userService.createRandomUser();

    // Create new user auth
    const newUserAuth = await this.userService.createUserAuth({
      user: newUser,
      provider: AuthProvider.GOOGLE,
      providerUserId: uniqueId,
      displayIdentifier,
    });

    return newUserAuth;
  }
  
  
  async bindGoogleAccount(
    userId: number, 
    uniqueId: string, 
    displayIdentifier: string
  ): Promise<IUserAuth> {
    
    const user = await this.db.user.findOne({ id: userId });
    if (!user) {
      throw new AppError({
        status: StatusCodes.NOT_FOUND,
        message: 'User not found'
      });
    }
    
    const userAuth = await this.db.userAuth.findOne({
      provider: AuthProvider.GOOGLE,
      providerUserId: uniqueId,
    });
    if (userAuth) {
      throw new AppError({
        status: StatusCodes.CONFLICT,
        message: 'User auth already exist',
      });
    }
    
    const newUserAuth = await this.userService.createUserAuth({
      user,
      provider: AuthProvider.GOOGLE,
      providerUserId: uniqueId,
      displayIdentifier
    });
    
    return newUserAuth;
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


  async registerByGithub(uniqueId: string, displayIdentifier: string): Promise<IUserAuth> {
    const userAuth = await this.db.userAuth.findOne({
      provider: AuthProvider.GITHUB,
      providerUserId: uniqueId,
    });

    if (userAuth) {
      return userAuth;
    }

    // Create new user
    const newUser = await this.userService.createRandomUser();

    // Create new user auth
    const newUserAuth = await this.userService.createUserAuth({
      user: newUser,
      provider: AuthProvider.GITHUB,
      providerUserId: uniqueId,
      displayIdentifier,
    });

    return newUserAuth;
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
  
  
  async registerByDiscord(uniqueId: string, displayIdentifier: string): Promise<IUserAuth> {
    const userAuth = await this.db.userAuth.findOne({
      provider: AuthProvider.DISCORD,
      providerUserId: uniqueId,
    });

    if (userAuth) {
      return userAuth;
    }

    // Create new user
    const newUser = await this.userService.createRandomUser();

    // Create new user auth
    const newUserAuth = await this.userService.createUserAuth({
      user: newUser,
      provider: AuthProvider.DISCORD,
      providerUserId: uniqueId,
      displayIdentifier,
    });

    return newUserAuth;
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


  async registerByMicrosoft(uniqueId: string, displayIdentifier: string): Promise<IUserAuth> {
    const userAuth = await this.db.userAuth.findOne({
      provider: AuthProvider.MICROSOFT,
      providerUserId: uniqueId,
    });

    if (userAuth) {
      return userAuth;
    }

    // Create new user
    const newUser = await this.userService.createRandomUser();

    // Create new user auth
    const newUserAuth = await this.userService.createUserAuth({
      user: newUser,
      provider: AuthProvider.MICROSOFT,
      providerUserId: uniqueId,
      displayIdentifier,
    });

    return newUserAuth;
  }
  
  
  createJWT(user: IUser) {
    const payload: TokenPayload = { user_id: Number(user.id) };
    const token = jwt.sign(payload, Env.SECRET!, { expiresIn: '5m' });
    return token;
  }
  
  
  async verifyJWT(token: string): Promise<TokenPayload> {
    const decoded = jwt.verify(token, Env.SECRET!);
    return decoded as TokenPayload;
  }
  
  
  async genereateUserToken(id: number): Promise<string> {
    const user = await this.db.user.findOne({ id });
    if (!user) {
      throw new AppError({
        status: StatusCodes.NOT_FOUND,
        message: 'User not found',
      });
    }
    const accessToken = this.createJWT(user);
    return accessToken;
  }
  
  
  getAccessTokenCookie(req: Request) {
    return req.cookies.access_token;
  }
  
  setAccessTokenCookie(res: Response, token: string) {
    res.cookie('access_token', token);
  }
  
  
  async createOAuthState(req: Request): Promise<OAuthBindState> {
    // const authHeader = req.headers['authorization'];
    // const token = authHeader && authHeader.split(' ')[1];
    const accessToken = this.getAccessTokenCookie(req);
    const decoded = await this.verifyJWT(accessToken);
    return {
      state: randomUUID(),
      userId: decoded.user_id,
    };
  }
  
  
  verifyOAuthState(req: Request, state: string): OAuthBindState {
    if (!req.session.oauth) {
      throw new AppError({
        status: StatusCodes.NOT_FOUND,
        message: 'OAuth state is not found',
      });
    }
    if (state !== req.session.oauth.state) {
      throw new AppError({
        status: StatusCodes.UNAUTHORIZED,
        message: 'OAuth state is invalid',
      });
    }
    return req.session.oauth;
  }
};




export function createAuthService(db: Services) {
  return new AuthService(db);
};