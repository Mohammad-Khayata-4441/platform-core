import { AppLogger } from './app-logger';
import { RequestContext } from '../request-context/request-context';

function captureStdout(fn: () => void): Array<Record<string, unknown>> {
    const write = jest.spyOn(process.stdout, 'write').mockImplementation(() => true);
    try {
        fn();
        return write.mock.calls.map((call) => JSON.parse(String(call[0])) as Record<string, unknown>);
    } finally {
        write.mockRestore();
    }
}

describe('AppLogger (json mode)', () => {
    it('adds correlationId inside a request context', () => {
        const logger = new AppLogger({ json: true });
        const [line] = captureStdout(() =>
            RequestContext.run({ correlationId: 'corr-1' }, () => logger.log('posted', 'PaymentsService')),
        );
        expect(line).toMatchObject({ level: 'log', message: 'posted', context: 'PaymentsService', correlationId: 'corr-1' });
    });

    it('omits correlationId outside a context', () => {
        const logger = new AppLogger({ json: true });
        const [line] = captureStdout(() => logger.log('boot', 'Bootstrap'));
        expect(line).not.toHaveProperty('correlationId');
    });

    it('keeps structured object messages as objects', () => {
        const logger = new AppLogger({ json: true });
        const [line] = captureStdout(() =>
            RequestContext.run({ correlationId: 'corr-2' }, () => logger.log({ msg: 'run', tenantId: 't1' }, 'Recon')),
        );
        expect(line).toMatchObject({ message: { msg: 'run', tenantId: 't1' }, correlationId: 'corr-2' });
    });
});
