import type { Request, Response, NextFunction } from "express";
import { StatusCodes } from 'http-status-codes';

import { AppError } from '@/error.js';
import type { TokenPayload } from "@/features/auth/auth.dto.js";
import { getAccessTokenCookie, verifyAccessToken } from "@/utils/auth-utils.js";



export async function JWTGuardMiddleware(req: Request, res: Response, next: NextFunction) {
  const accessToken = getAccessTokenCookie(req);
  const decoded = await verifyAccessToken(accessToken);
  res.locals.user = decoded;
  next();
}


export function getDecodedFromJWTGuard(res: Response): TokenPayload {
  const decoded = res.locals.user;
  if (!decoded) {
    throw new AppError({
      status: StatusCodes.UNAUTHORIZED,
      message: 'JWTGuardMiddleware was not applied',
    });
  }
  return decoded;
}