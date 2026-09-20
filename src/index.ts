import * as path from 'path';

import express, { type NextFunction, type Request, type Response } from 'express';
import expressContext from 'express-request-context';  // Enable req.context and res.context
import expressSession from 'express-session';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import { RequestContext } from '@mikro-orm/core';

import { type Services } from '@/db/db.js';
import Env from '@/env-loader.js';
import { createAuthController } from '@/features/auth/auth.controller.js';
import type { OAuthBindState, TokenPayload } from '@/features/auth/auth.dto.js';
import type { IUser } from '@/features/user/entities/User.js';
import type { IUserAuth } from '@/features/user/entities/UserAuth.js';
import { createUserController } from '@/features/user/user.controller.js';
import { LoggerMiddleware } from '@/middleware/logger.js';



declare module 'express-session' {
	interface SessionData {
		oauth: OAuthBindState;
	}
}

export async function createApp(db: Services) {
	const app = express();
	app.use(express.urlencoded({ extended: true }));         // Access form data from user
	app.use(express.json());                                 // Parse json data from response
	app.use(cookieParser());                                 // Parse cookies from request header
	app.use(expressSession({
		secret: Env.SECRET!,
		resave: false,
		saveUninitialized: false,
		cookie: {
			httpOnly: true,
			sameSite: true,
		},
	}));
	app.use(expressContext.default());
	app.use(LoggerMiddleware);
	// app.use(JWTGuardMiddleware);
	// Context for Entity manager
	app.use((req: Request, res: Response, next: NextFunction) => {
		RequestContext.create(db.orm.em, next);
	});

	app.set("view engine", "ejs");                           // View engine use .ejs extensions
	app.set('views', path.join(import.meta.dirname, 'views'));

	app.get('/health-check', (req, res) => {
		res.status(200).send({ status: 'healthy' });
	});

	// Pages Routers
	app.get('/', async (req, res) => {
		let isLoggedIn = false;
		let user: IUser | null = null;
		let userAuths: IUserAuth[] = [];

		const accessToken = req.cookies?.access_token;
		if (accessToken) {
			try {
				const decoded = jwt.verify(accessToken, Env.SECRET!) as TokenPayload;
				user = await db.user.findOne({ id: decoded.user_id });
				if (user) {
					isLoggedIn = true;
				}
			} catch {
				// Invalid or expired token
			}
		}

		if (isLoggedIn) {
			userAuths = await db.userAuth.find({ user: user!.id });
		}

		res.render('home', { isLoggedIn, user, userAuths });
	});

	app.use('/auth/login', (req, res) => {
		res.render('login');
	});

	app.use('/cookie', (req, res) => {
		res.cookie('name', 'rakka');
		res.send('Cookies send successfully');
	});

	// API Routers
	const apiRouter = express.Router();
	apiRouter.use('/auth', createAuthController(db));
	apiRouter.use('/user', createUserController(db));

	app.use('/api/v1', apiRouter);

	return app;
}