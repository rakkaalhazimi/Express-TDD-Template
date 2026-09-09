import { StatusCodes } from 'http-status-codes';
import { type Response } from '@/response.js';



export async function handleError(
    e: unknown, 
    message: string, 
    status: number | null = null
  ): Promise<Response> {
  const error = e as Error;
  console.error(error.stack, error.message);
  
  return {
    message, 
    status: status ?? StatusCodes.INTERNAL_SERVER_ERROR,
    data: error.message,
  };
}