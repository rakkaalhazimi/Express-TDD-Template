import express from 'express';
import type { Request, Response } from 'express';
import { type TokenPayload } from 'google-auth-library';

import { createAuthService } from './auth.service.js';
import type { Services } from '@/db/db.js';
import { handleError } from '@/error.js';
import Env from '@/env-loader.js';



export function createAuthController(db: Services) {
  const AuthController = express.Router();
  const authService = createAuthService(db);


  AuthController.post('/login', async (req: Request, res: Response) => {
    let user: any = null;
    try {
      const { username, password } = req.body;
      const loginResponse = await authService.login(username, password);
      user = loginResponse.data;
    } catch (e) {
      const response = await handleError(e, 'Login failed');
      return res.status(response.status).send(response);
    }

    try {
      const response = await authService.genereateUserToken(user.id);
      return res.status(response.status).send(response);
    } catch (e) {
      const response = await handleError(e, 'Create JWT Failed');
      return res.status(response.status).send(response);
    }
  });
  

  AuthController.post('/register', async (req: Request, res: Response) => {
    try {
      const { username, password, confirmPassword } = req.body;
      const response = await authService.register(username, password, confirmPassword);
      return res.status(response.status).send(response);
    } catch (e) {
      const response = await handleError(e, 'Register failed');
      return res.status(response.status).send(response);
    }
  });
  

  AuthController.get('/google', async (req: Request, res: Response) => {
    const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    url.search = new URLSearchParams({
      client_id: Env.GOOGLE_CLIENT_ID!,
      redirect_uri: Env.GOOGLE_REDIRECT_URI!,
      response_type: 'code',
      scope: 'openid email profile',
    }).toString();
    res.redirect(url.toString());
  });
  

  AuthController.get('/google/callback', async (req: Request, res: Response) => {
    let payload: TokenPayload | null = null;
    try {
      payload = await authService.authorizeGoogle(req);
    } catch (e) {
      const response = await handleError(e, 'Google Authorization failed');
      return res.status(response.status).send(response);
    }

    let userAuth: any = null;
    try {
      const googleResponse = await authService.registerByGoogle(payload!.sub, payload!.email!);
      userAuth = googleResponse.data;
    } catch (e) {
      const response = await handleError(e, 'Login/Register with google failed');
      return res.status(response.status).send(response);
    }

    try {
      const response = await authService.genereateUserToken(userAuth.user?.id);
      return res.status(response.status).send(response);
    } catch (e) {
      const response = await handleError(e, 'Create JWT failed');
      return res.status(response.status).send(response);
    }
  });
  

  AuthController.get('/github', async (req: Request, res: Response) => {
    const url = new URL('https://github.com/login/oauth/authorize');
    url.search = new URLSearchParams({
      client_id: Env.GITHUB_CLIENT_ID!,
      redirect_uri: Env.GITHUB_REDIRECT_URI!,
      scope: 'read:user',
    }).toString();
    res.redirect(url.toString());
  });
  

  AuthController.get('/github/callback', async (req: Request, res: Response) => {
    let payload: any = null;
    try {
      payload = await authService.authorizeGithub(req);
    } catch (e) {
      const response = await handleError(e, 'Github Authorization failed');
      return res.status(response.status).send(response);
    }

    let userAuth: any = null;
    try {
      const { data } = await authService.registerByGithub(String(payload.id), payload.email || payload.login);
      userAuth = data;
    } catch (e) {
      const response = await handleError(e, 'Login/Register with github failed');
      return res.status(response.status).send(response);
    }

    try {
      const response = await authService.genereateUserToken(userAuth.user?.id);
      return res.status(response.status).send(response);
    } catch (e) {
      const response = await handleError(e, 'Create JWT failed');
      return res.status(response.status).send(response);
    }
  });
  

  AuthController.get('/discord', async (req: Request, res: Response) => {
    const url = new URL('https://discord.com/oauth2/authorize');
    url.search = new URLSearchParams({
      client_id: Env.DISCORD_CLIENT_ID!,
      redirect_uri: Env.DISCORD_REDIRECT_URI!,
      response_type: 'code',
      scope: 'identify',
    }).toString();
    res.redirect(url.toString());
  });
  

  AuthController.get('/discord/callback', async (req: Request, res: Response) => {
    let payload: any = null;
    try {
      payload = await authService.authorizeDiscord(req);
    } catch (e) {
      const response = await handleError(e, 'Discord Authorization failed');
      return res.status(response.status).send(response);
    }

    let userAuth: any = null;
    try {
      const discordResponse = await authService.registerByDiscord(String(payload.id), payload.username);
      userAuth = discordResponse.data;
    } catch (e) {
      const response = await handleError(e, 'Login/Register with discord failed');
      return res.status(response.status).send(response);
    }

    try {
      const response = await authService.genereateUserToken(userAuth.user?.id);
      return res.status(response.status).send(response);
    } catch (e) {
      const response = await handleError(e, 'Create JWT failed');
      return res.status(response.status).send(response);
    }
  });
  

  AuthController.get('/microsoft', async (req: Request, res: Response) => {
    const url = await authService.getMSAuthUrl();
    res.redirect(url);
  });
  

  AuthController.get('/microsoft/callback', async (req: Request, res: Response) => {
    let payload: any = null;
    try {
      payload = await authService.authorizeMicrosoft(req);
    } catch (e) {
      const response = await handleError(e, 'Microsoft Authorization failed');
      return res.status(response.status).send(response);
    }

    let userAuth: any = null;
    try {
      const microsoftResponse = await authService.registerByMicrosoft(String(payload.oid), payload.userPrincipalName);
      userAuth = microsoftResponse.data;
    } catch (e) {
      const response = await handleError(e, 'Login/Register with microsoft failed');
      return res.status(response.status).send(response);
    }

    try {
      const response = await authService.genereateUserToken(userAuth.user?.id);
      return res.status(response.status).send(response);
    } catch (e) {
      const response = await handleError(e, 'Create JWT failed');
      return res.status(response.status).send(response);
    }
  });

  return AuthController;
}