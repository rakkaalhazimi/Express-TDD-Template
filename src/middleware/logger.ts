import { performance } from "node:perf_hooks";

import type { NextFunction, Request, Response } from 'express';
import winston from 'winston';

import type { AppError } from "@/error.js";



function shortId() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

const colors = {
  error: 'redBG',
  warn: 'yellowBG',
  info: 'greenBG',
  http: 'magentaBG',
  debug: 'whiteBG',
};
winston.addColors(colors);


const { 
  combine, 
  timestamp, 
  colorize,
  printf, 
  errors 
} = winston.format;


function centerizeLevel(level: string) {
  const rawLevel = level.replace(/\u001b\[[0-9;]*m/g, '').toLowerCase();
  const upperLevel = rawLevel.toUpperCase();
  const centeredLevelText = ` ${upperLevel} `.padEnd(7, ' ');
  const coloredBlock = colorize().colorize(rawLevel, centeredLevelText);
  return coloredBlock;
}


const humanReadableFormat = printf(
  ({ level, timestamp, url, requestId, method, message, statusCode, durationMs, stack }) => {
    
    const coloredLevel = centerizeLevel(level);
    
    let format = `${level} ${timestamp} [${requestId}] ${method} ${url}`;
    if (statusCode) {
      format += ` ${statusCode}`;
    }
    if (message !== '') {
      format += ` - ${message}`;
    }
    if (durationMs) {
      format += ` (${Math.round(Number(durationMs))} ms)`;
    }
    if (stack) {
      return `${format}\n${stack}`;
    }
    return format;
});

const logger = winston.createLogger({
  format: combine(
    errors({ stack: true }),
    timestamp(),
    colorize(),
    humanReadableFormat,
  ),
  transports: [new winston.transports.Console()],
  levels: levels,
});

export function logError(req: Request, error: AppError) {
  req.context.logger?.error(error);
}


export function LoggerMiddleware(req: Request, res: Response, next: NextFunction) {
  const start = performance.now();
  
  const requestId = req.headers["x-request-id"] || shortId();
  const { method, url, ip, headers } = req;
  const userAgent = headers["user-agent"];
  
  const childLogger = logger.child({
    requestId,
    url,
    method,
  });

  childLogger.info('');
  req.context.logger = childLogger;
  
  res.on('finish', () => {
    const { statusCode } = res;
    const logData = {
      durationMs: performance.now() - start,
      statusCode,
    };
    
    if (statusCode >= 500) {
      childLogger.error('Server error', logData);
    } else if (statusCode >= 400) {
      childLogger.warn('Client error', logData);
    } else {
      childLogger.info('', logData);
    }
  });

  next();
}