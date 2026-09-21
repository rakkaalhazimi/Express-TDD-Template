import type { Request, Response, NextFunction } from 'express';

import { createAppError } from '@/error.js';
import { logError } from './logger-middleware.js';
import { createErrorResponse } from '@/response.js';



export function ErrorMiddleware(err: Error, req: Request, res: Response, _next: NextFunction) {
	const appError = createAppError(err, `${req.method} ${req.path} failed`);
	logError(req, appError);
	const errorResponse = createErrorResponse(appError);
	return res.status(appError.status).json(errorResponse);
}