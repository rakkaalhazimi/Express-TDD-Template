import { randomUUID } from 'node:crypto';

import { StatusCodes } from 'http-status-codes';


export interface ErrorDetail {
	id: string;
}

interface AppErrorOptions {
	status: number;
	message: string;
	cause?: unknown;
}

export class AppError extends Error {
	public status: number;
	public serverMessage: string;
	public cause?: unknown;
	public readonly errorId: string;

	constructor(options: AppErrorOptions) {
		super(options.message);
		this.status = options.status;
		this.cause = options.cause;
		this.errorId = randomUUID();
	}
}


export function createAppError(error: unknown, message: string): AppError {
	if (error instanceof AppError) {
		return error;
	}
	const appError = new AppError({
		status: StatusCodes.INTERNAL_SERVER_ERROR,
		message: message,
		cause: error,
	});
	return appError;
}