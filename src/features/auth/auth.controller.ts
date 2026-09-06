import express from 'express';
import type { Request, Response } from "express";
import { auth, OAuth2Client, type TokenPayload } from 'google-auth-library';

import { createAuthService } from './auth.service.js';
import type { Services } from '@/db/db.js';
import { handleError } from '@/error.js';
import Env from '@/env-loader.js';



export function createAuthController(db: Services) {
  const AuthController = express.Router();
  const authService = createAuthService(db);

  const client = new OAuth2Client(Env.GOOGLE_CLIENT_ID);


  AuthController.post('/login', async (req: Request, res: Response) => {
    try {
      const { username, password } = req.body;
      const response = await authService.login(username, password);
      res.status(response.status).send(response);

    } catch (e) {
      const response = await handleError(e, 'Login failed');
      res.status(response.status).send(response);
    }
  });


  AuthController.post('/register', async (req: Request, res: Response) => {
    try {
      const { username, password, confirmPassword } = req.body;
      const response = await authService.register(username, password, confirmPassword);
      res.status(response.status).send(response);

    } catch (e) {
      const response = await handleError(e, 'Register failed');
      res.status(response.status).send(response);
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
    // Authorize request from google
    let payload: TokenPayload | null = null;
    try {
      payload = await authService.authorizeGoogle(req);
    } catch(e) {
      const response = await handleError(e, 'Google Authorization failed');
      res.status(response.status).send(response);
    }
    
    // Login / Register with google id
    try {
      const response = await authService.registerByGoogle(payload!.sub, payload!.email!);
      res.status(response.status).send(response);
    } catch(e) {
      const response = await handleError(e, 'Login/Register with google failed');
      res.status(response.status).send(response);
    }
  });

  return AuthController;
}