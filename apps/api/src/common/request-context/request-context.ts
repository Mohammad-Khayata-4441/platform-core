import { AsyncLocalStorage } from 'node:async_hooks';
import { randomUUID } from 'node:crypto';

/** Where a unit of work originated. Persisted on AuditLog.source. */
export type AuditSource = 'HTTP' | 'GL' | 'SCHEDULER' | 'BUSINESS_SETUP' | 'SYSTEM';

export interface RequestContextStore {
    correlationId: string;
    source: AuditSource;
    userId?: string;
    tenantId?: string;
    ipAddress?: string;
    metadata: Record<string, unknown>;
}

const storage = new AsyncLocalStorage<RequestContextStore>();

/**
 * Phase 7.3.2 — carries the correlation id (and actor/source) from the HTTP
 * request, scheduler tick or setup task through services, transactions, logs
 * and audit rows without threading parameters through every call.
 */
export const RequestContext = {
    run<T>(patch: Partial<RequestContextStore>, fn: () => T): T {
        const parent = storage.getStore();
        const store: RequestContextStore = {
            correlationId: patch.correlationId ?? parent?.correlationId ?? randomUUID(),
            source: patch.source ?? parent?.source ?? 'SYSTEM',
            userId: patch.userId ?? parent?.userId,
            tenantId: patch.tenantId ?? parent?.tenantId,
            ipAddress: patch.ipAddress ?? parent?.ipAddress,
            metadata: { ...parent?.metadata, ...patch.metadata },
        };
        return storage.run(store, fn);
    },

    get(): RequestContextStore | undefined {
        return storage.getStore();
    },

    correlationId(): string | undefined {
        return storage.getStore()?.correlationId;
    },

    /** Called once the JWT guard has resolved the user (see AuditInterceptor). */
    setActor(userId: string, tenantId: string): void {
        const store = storage.getStore();
        if (!store) return;
        store.userId = userId;
        store.tenantId = tenantId;
    },
};
