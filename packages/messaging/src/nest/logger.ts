import { Logger } from '@nestjs/common';
import type { MessagingLogger } from '../logger.js';

export function nestLogger(context: string): MessagingLogger {
  const logger = new Logger(context);
  return {
    log: (message) => logger.log(message),
    warn: (message) => logger.warn(message),
    error: (message, error) => {
      if (error instanceof Error) logger.error(message, error.stack);
      else if (error !== undefined) logger.error(`${message}: ${String(error)}`);
      else logger.error(message);
    },
  };
}
