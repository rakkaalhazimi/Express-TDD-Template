import express from 'express';
import type { Request, Response } from "express";
import { StatusCodes } from 'http-status-codes';

import { createUserService } from './user.service.js';
import type { Services } from '@/db/db.js';


export function createUserController(db: Services) {
	const UserController = express.Router();
	const userService = createUserService(db);

  
	UserController.post('/create', async (req: Request, res: Response) => {
		const user = await userService.createUser(req.body);
		res.status(StatusCodes.OK).send({
			message: 'Create user success',
			data: { username: user.username }
		});
	});

	return UserController;
}