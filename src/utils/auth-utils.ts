import { StatusCodes } from 'http-status-codes';
import jwt from 'jsonwebtoken';

import Env from '@/env-loader.js';
import { AppError } from '@/error.js';
import type { TokenPayload } from '@/features/auth/auth.dto.js';
import type { IUser } from '@/features/user/entities/User.js';



export function createAccessToken(user: IUser) {
	const payload: TokenPayload = { user_id: Number(user.id) };
	const token = jwt.sign(payload, Env.SECRET!, { expiresIn: '1h' });
	return token;
}


export async function verifyAccessToken(token: string): Promise<TokenPayload> {
	try {
		const decoded = jwt.verify(token, Env.SECRET!);
		return decoded as TokenPayload;
	} catch (error) {
		if (
			error instanceof jwt.TokenExpiredError
			|| error instanceof jwt.JsonWebTokenError
			|| error instanceof jwt.NotBeforeError
		) {
			throw new AppError({
				status: StatusCodes.UNAUTHORIZED,
				message: error.message,
				cause: error,
			});
		}
		throw error;
	}
}