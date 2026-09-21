import type { Request, Response, NextFunction } from "express";

import type { TokenPayload } from "@/features/auth/auth.dto.js";
import { getAccessTokenCookie, verifyAccessToken } from "@/utils/auth-utils.js";



export async function JWTGuardMiddleware(req: Request, res: Response, next: NextFunction) {
  const accessToken = getAccessTokenCookie(req);
  const decoded = await verifyAccessToken(accessToken);
  res.locals.user = decoded as TokenPayload;
  next();
}