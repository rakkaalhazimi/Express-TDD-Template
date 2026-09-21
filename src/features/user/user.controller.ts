import express from 'express';
import type { Request, Response } from "express";
import { StatusCodes } from 'http-status-codes';

import { createUserService } from './user.service.js';
import type { Services } from '@/db/db.js';
import { getDecodedFromJWTGuard, JWTGuardMiddleware } from '@/middleware/jwt-guard-middleware.js';


export function createUserController(db: Services) {
  const UserController = express.Router();
  const userService = createUserService(db);


  UserController.post('/create', JWTGuardMiddleware, async (req: Request, res: Response) => {
    const user = await userService.createUser(req.body);
    res.status(StatusCodes.OK).send({
      message: 'Create user success',
      data: { username: user.username },
    });
  });


  UserController.get('/me', JWTGuardMiddleware, async (req: Request, res: Response) => {
    const decoded = getDecodedFromJWTGuard(res);
    const user = await userService.findUserById(decoded.user_id);
    res.status(StatusCodes.OK).send({
      message: 'Find user success',
      data: user,
    });
  });

  return UserController;
}