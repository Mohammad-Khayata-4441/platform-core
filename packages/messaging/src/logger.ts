export interface MessagingLogger {
  log(message: string): void;
  warn(message: string): void;
  error(message: string, error?: unknown): void;
}

export const silentLogger: MessagingLogger = {
  log: () => undefined,
  warn: () => undefined,
  error: () => undefined,
};
