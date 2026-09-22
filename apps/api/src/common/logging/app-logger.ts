import { ConsoleLogger, type LogLevel } from '@nestjs/common';
import { RequestContext } from '../request-context/request-context';

/**
 * Phase 7.3.1 — Nest's built-in JSON logger plus the request correlation id,
 * so a log line can be joined to its AuditLog rows (AuditLog.correlationId).
 */
export class AppLogger extends ConsoleLogger {
    protected override getJsonLogObject(
        message: unknown,
        options: { context: string; logLevel: LogLevel; writeStreamType?: 'stdout' | 'stderr'; errorStack?: unknown },
    ) {
        const base = super.getJsonLogObject(message, options);
        const correlationId = RequestContext.correlationId();
        return correlationId ? { ...base, correlationId } : base;
    }
}
