import express from 'express';
import type { Request, Response } from "express";

import { createAuthService } from './auth.service.js';
import type { Services } from '@/db/db.js';
import { handleError } from '@/error.js';



export function createAuthController(db: Services) {
  const AuthController = express.Router();
  const authService = createAuthService(db);
  
  
  AuthController.get('/login', (req: Request, res: Response) => {
    res.render('login');
  });
  
  
  AuthController.post('/login', async (req: Request, res: Response) => {
    try {
      const { username, password } = req.body;
      const response = await authService.login(username, password);
      res.status(response.status).send(response);
      
    } catch(e) {
      const response = await handleError(e, 'Login failed');
      res.status(response.status).send(response);
    }
  });
  
  
  AuthController.post('/register', async (req: Request, res: Response) => {
    try {
      const { username, password, confirmPassword } = req.body;
      const response = await authService.register(username, password, confirmPassword);
      res.status(response.status).send(response);
      
    } catch(e) {
      const response = await handleError(e, 'Register failed');
      res.status(response.status).send(response);
    }
  });
  
  
  return AuthController;
}