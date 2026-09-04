import express from 'express';
import type { Request, Response } from "express";

import { createUserService } from './user.service.js';
import type { Services } from '@/db/db.js';


export function createUserController(db: Services) {
  const UserController = express.Router();
  const userService = createUserService(db);

  
  UserController.post('/create', async (req: Request, res: Response) => {
    const response = await userService.createUser(req.body);
    res.status(response.status).send(response);
  });

  return UserController;
}