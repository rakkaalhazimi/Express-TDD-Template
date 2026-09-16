import express from 'express';
import type { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';

import { createAuthService } from './auth.service.js';
import type { Services } from '@/db/db.js';
import Env from '@/env-loader.js';
import { createAppError } from '@/error.js';
import { logError } from '@/middleware/logger.js';



export function createAuthController(db: Services) {
  const AuthController = express.Router();
  const authService = createAuthService(db);


  AuthController.post('/login', async (req: Request, res: Response) => {
    try {
      const user = await authService.login(req.body.username, req.body.password);
      const accessToken = await authService.genereateUserToken(Number(user.id));
      return res.status(StatusCodes.OK).json({
        message: 'Login success',
        data: { accessToken },
      });
      
    } catch (error) {
      const appError = createAppError(error, 'Login failed');
      logError(req, appError);
      return res.status(appError.status).json({
        message: appError.message,
        data: null,
      });
    }
  });
  

  AuthController.post('/register', async (req: Request, res: Response) => {
    try {
      const { username, password, confirmPassword } = req.body;
      const userAuth = await authService.register(username, password, confirmPassword);
      return res.status(StatusCodes.CREATED).send({
        message: 'Register success',
        data: { providerUserId: userAuth.providerUserId, provider: userAuth.provider },
      });
      
    } catch (error) {
      const appError = createAppError(error, 'Register failed');
      req.context.error = appError;
      return res.status(appError.status).json({
        message: appError.message,
        data: null,
      });
    }
  });
  
  
  AuthController.post('/password/bind', async (req: Request, res: Response) => {
    try {
      const { id, username, password, confirmPassword } = req.body;
      const userAuth = await authService.bindPasswordAccount(
        parseInt(id), 
        username, 
        password, 
        confirmPassword,
      );
      return res.status(StatusCodes.CREATED).send({
        message: 'Bind password auth success',
        data: { username, provider: userAuth.provider },
      });
      
    } catch (error) {
      const appError = createAppError(error, 'Bind password auth failed');
      logError(req, appError);
      return res.status(appError.status).json({
        message: appError.message,
        data: null,
      });
    }
  });
  

  AuthController.get('/google', async (req: Request, res: Response) => {
    try {
      const oauthUrl = authService.createGoogleOAuthUrl();
      res.redirect(oauthUrl);
      
    } catch(error) {
      const appError = createAppError(error, 'Google login failed');
      logError(req, appError);
      return res.status(appError.status).json({
        message: appError.message,
        data: null,
      });
    }
  });
  

  AuthController.get('/google/callback', async (req: Request, res: Response) => {
    try {
      const payload = await authService.authorizeGoogle(req);
      const userAuth = await authService.registerByGoogle(payload.sub, payload.email!);
      const accessToken = await authService.genereateUserToken(Number(userAuth.user!.id));
      return res.status(StatusCodes.OK).send({
        message: 'Google authentication successful',
        data: { accessToken }
      });
      
    } catch (error) {
      const appError = createAppError(error, 'Google authentication failed');
      return res.status(appError.status).send({
        message: appError.message,
        data: null,
      });
    }
  });
  
  
  AuthController.get('/google-bind', async (req: Request, res: Response) => {
    try {
      req.session.oauth = await authService.createOAuthState(req);
      const oauthUrl = authService.createGoogleOAuthUrl();
      res.redirect(oauthUrl);
    
    } catch(error) {
      const appError = createAppError(error, 'Google bind account failed');
      logError(req, appError);
      return res.status(appError.status).json({
        message: appError.message,
        data: null,
      });
    }
  });
  
  
  AuthController.post('/google/bind', async (req: Request, res: Response) => {
    try {
      const { state } = req.query;
      const payload = await authService.authorizeGoogle(req);
      const authState = authService.verifyOAuthState(req, state as string);
      const userAuth = await authService.bindGoogleAccount(authState.userId, payload.sub, payload.email!);
      
      return res.status(StatusCodes.CREATED).send({
        message: 'Bind google auth success',
        data: { 
          providerUserId: userAuth.providerUserId, 
          provider: userAuth.provider 
        },
      });
      
    } catch (error) {
      const appError = createAppError(error, 'Bind password auth failed');
      logError(req, appError);
      return res.status(appError.status).json({
        message: appError.message,
        data: null,
      });
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
    try {
      const payload = await authService.authorizeGithub(req);
      const userAuth = await authService.registerByGithub(String(payload.id), payload.email || payload.login);
      const accessToken = await authService.genereateUserToken(Number(userAuth.user!.id));
      return res.status(StatusCodes.OK).send({
        message: 'Github authentication successful',
        data: { accessToken }
      });

    } catch (error) {
      const appError = createAppError(error, 'Github authentication failed');
      return res.status(appError.status).send({
        message: appError.message,
        data: null,
      });
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
    try {
      const payload = await authService.authorizeDiscord(req);
      const userAuth = await authService.registerByDiscord(String(payload.id), payload.username);
      const accessToken = await authService.genereateUserToken(Number(userAuth.user!.id));
      return res.status(StatusCodes.OK).send({
        message: 'Discord authentication successful',
        data: { accessToken }
      });

    } catch (error) {
      const appError = createAppError(error, 'Discord authentication failed');
      return res.status(appError.status).send({
        message: appError.message,
        data: null,
      });
    }
  });
  

  AuthController.get('/microsoft', async (req: Request, res: Response) => {
    const url = await authService.getMSAuthUrl();
    res.redirect(url);
  });
  

  AuthController.get('/microsoft/callback', async (req: Request, res: Response) => {
    try {
      const payload = await authService.authorizeMicrosoft(req);
      const userAuth = await authService.registerByMicrosoft(String(payload.oid), payload.userPrincipalName);
      const accessToken = await authService.genereateUserToken(Number(userAuth.user!.id));
      return res.status(StatusCodes.OK).send({
        message: 'Microsoft authentication successful',
        data: { accessToken }
      });

    } catch (error) {
      const appError = createAppError(error, 'Microsoft authentication failed');
      return res.status(appError.status).send({
        message: appError.message,
        data: null,
      });
    }
  });

  return AuthController;
}