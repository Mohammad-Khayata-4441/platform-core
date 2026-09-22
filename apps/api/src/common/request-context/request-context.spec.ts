import { RequestContext } from './request-context';
import { correlationIdMiddleware } from './correlation-id.middleware';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

describe('RequestContext', () => {
    it('is undefined outside a context', () => {
        expect(RequestContext.get()).toBeUndefined();
        expect(RequestContext.correlationId()).toBeUndefined();
    });

    it('generates a correlation id and defaults source to SYSTEM', () => {
        RequestContext.run({}, () => {
            expect(RequestContext.correlationId()).toMatch(UUID);
            expect(RequestContext.get()?.source).toBe('SYSTEM');
        });
    });

    it('nested runs inherit the parent and merge metadata', () => {
        RequestContext.run({ correlationId: 'corr-1', source: 'HTTP', userId: 'u1', metadata: { a: 1 } }, () => {
            RequestContext.run({ source: 'BUSINESS_SETUP', metadata: { taskType: 'OPENING_CASH' } }, () => {
                expect(RequestContext.get()).toEqual({
                    correlationId: 'corr-1',
                    source: 'BUSINESS_SETUP',
                    userId: 'u1',
                    tenantId: undefined,
                    ipAddress: undefined,
                    metadata: { a: 1, taskType: 'OPENING_CASH' },
                });
            });
            expect(RequestContext.get()?.source).toBe('HTTP');
        });
    });

    it('survives async boundaries', async () => {
        await RequestContext.run({ correlationId: 'corr-async' }, async () => {
            await new Promise((resolve) => setTimeout(resolve, 1));
            expect(RequestContext.correlationId()).toBe('corr-async');
        });
    });

    it('setActor fills the current store and is a no-op outside a context', () => {
        expect(() => RequestContext.setActor('u1', 't1')).not.toThrow();
        RequestContext.run({}, () => {
            RequestContext.setActor('u2', 't2');
            expect(RequestContext.get()).toMatchObject({ userId: 'u2', tenantId: 't2' });
        });
    });
});

describe('correlationIdMiddleware', () => {
    function invoke(incoming: string | undefined) {
        const res = { setHeader: jest.fn() };
        const req = { header: jest.fn().mockReturnValue(incoming), ip: '10.0.0.1' };
        let seen: ReturnType<typeof RequestContext.get>;
        correlationIdMiddleware(req as never, res as never, () => {
            seen = RequestContext.get();
        });
        return { res, seen: seen! };
    }

    it('generates an id, echoes it, and opens an HTTP context', () => {
        const { res, seen } = invoke(undefined);
        expect(seen.correlationId).toMatch(UUID);
        expect(seen.source).toBe('HTTP');
        expect(seen.ipAddress).toBe('10.0.0.1');
        expect(res.setHeader).toHaveBeenCalledWith('x-correlation-id', seen.correlationId);
    });

    it('honours a well-formed incoming id', () => {
        expect(invoke('abc-123_DEF.4').seen.correlationId).toBe('abc-123_DEF.4');
    });

    it('replaces a malformed incoming id (header injection / oversize)', () => {
        expect(invoke('bad id\r\nX-Evil: 1').seen.correlationId).toMatch(UUID);
        expect(invoke('a'.repeat(129)).seen.correlationId).toMatch(UUID);
    });
});
