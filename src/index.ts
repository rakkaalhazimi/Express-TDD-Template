import * as path from 'path';

import express, { type NextFunction, type Request, type Response } from 'express';
import expressContext from 'express-request-context';  // Enable req.context and res.context
import expressSession from 'express-session';
import { RequestContext } from '@mikro-orm/core';

import { type Services } from '@/db/db.js';
import { createAuthController } from '@/features/auth/auth.controller.js';
import { createUserController } from '@/features/user/user.controller.js';
import { LoggerMiddleware } from '@/middleware/logger.js';



export async function createApp(db: Services) {
  const app = express();
  app.use(express.urlencoded({ extended: true }));         // Access form data from user
  app.use(express.json());                                 // Parse json data from response
  app.use(expressSession({
    secret: 'secret',
    resave: false,
    saveUninitialized: false,
  }));
  app.use(expressContext.default());
  app.use(LoggerMiddleware);
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
  app.get('/', (req, res) => {
    res.render('home');
  });
  
  app.use('/auth/login', (req, res) => {
    res.render('login');
  });
  
  // API Routers
  const apiRouter = express.Router();
  apiRouter.use('/auth', createAuthController(db));
  apiRouter.use('/user', createUserController(db));
  
  app.use('/api/v1', apiRouter);
  
  return app;
}