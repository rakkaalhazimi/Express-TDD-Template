import type { TokenPayload } from '@/features/auth/auth.dto.js';

declare global {
  namespace Express {
    interface Locals {
      user: TokenPayload
    }
  }
}

export { };