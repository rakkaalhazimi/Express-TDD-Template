import type { AppError, ErrorDetail } from './error.js';



export interface ServerResponse<T = unknown> {
  message: string,
  data: T,
  error?: ErrorDetail,
};


export function createErrorResponse(error: AppError): ServerResponse {
  return {
    message: error.message,
    data: null,
    error: {
      id: error.errorId,
    },
  };
};