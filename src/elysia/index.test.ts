import { describe, expect, test } from 'bun:test';
import { Elysia } from 'elysia';
import { elysiaRequestLogger } from '.';
import type { Logger } from '../logging';

function createSpyLogger() {
  const calls: { level: string; args: unknown[] }[] = [];

  function makeLogger(
    sharedCalls: { level: string; args: unknown[] }[],
  ): Logger {
    function makeMethod(level: string) {
      return (...args: unknown[]) => {
        sharedCalls.push({ level, args });
      };
    }

    return {
      debug: makeMethod('debug') as Logger['debug'],
      info: makeMethod('info') as Logger['info'],
      warn: makeMethod('warn') as Logger['warn'],
      error: makeMethod('error') as Logger['error'],
      child() {
        return makeLogger(sharedCalls);
      },
    };
  }

  return { logger: makeLogger(calls), calls };
}

function tick() {
  return new Promise((resolve) => setTimeout(resolve, 10));
}

function createTestApp(logger: Logger) {
  return new Elysia()
    .use(elysiaRequestLogger(logger))
    .get('/ok', () => 'ok')
    .get('/not-found', ({ set }) => {
      set.status = 404;
      return 'not found';
    })
    .get('/error', () => {
      throw new Error('test error');
    });
}

describe('elysiaRequestLogger', () => {
  test('logs successful request at debug level', async () => {
    const { logger, calls } = createSpyLogger();
    const app = createTestApp(logger);

    await app.handle(new Request('http://localhost/ok'));
    await tick();

    const requestLogs = calls.filter(
      (c) => c.args[0] === 'request' || c.args[1] === 'request',
    );
    expect(requestLogs).toHaveLength(1);
    expect(requestLogs[0]!.level).toBe('debug');
  });

  test('logs error request at error level', async () => {
    const { logger, calls } = createSpyLogger();
    const app = createTestApp(logger);

    await app.handle(new Request('http://localhost/error'));
    await tick();

    const requestLogs = calls.filter(
      (c) => c.args[0] === 'request' || c.args[1] === 'request',
    );
    expect(requestLogs).toHaveLength(1);
    expect(requestLogs[0]!.level).toBe('error');
  });

  test('does not double log on error', async () => {
    const { logger, calls } = createSpyLogger();
    const app = createTestApp(logger);

    await app.handle(new Request('http://localhost/error'));
    await tick();

    const errorLogs = calls.filter((c) => c.level === 'error');
    expect(errorLogs).toHaveLength(1);
  });

  test('includes status and duration in log output', async () => {
    const { logger, calls } = createSpyLogger();
    const app = createTestApp(logger);

    await app.handle(new Request('http://localhost/ok'));
    await tick();

    const requestLog = calls.find(
      (c) => c.args[0] === 'request' || c.args[1] === 'request',
    );
    expect(requestLog).toBeDefined();

    const obj = requestLog!.args[0] as Record<string, unknown>;
    expect(obj).toHaveProperty('res');
    expect(obj).toHaveProperty('ms');
    expect((obj.res as Record<string, unknown>).status).toBe(200);
    expect(typeof obj.ms).toBe('number');
  });

  test('logs custom status codes', async () => {
    const { logger, calls } = createSpyLogger();
    const app = createTestApp(logger);

    await app.handle(new Request('http://localhost/not-found'));
    await tick();

    const requestLog = calls.find(
      (c) => c.args[0] === 'request' || c.args[1] === 'request',
    );
    expect(requestLog).toBeDefined();
    expect(requestLog!.level).toBe('debug');

    const obj = requestLog!.args[0] as Record<string, unknown>;
    expect((obj.res as Record<string, unknown>).status).toBe(404);
  });

  test('includes error object in error log', async () => {
    const { logger, calls } = createSpyLogger();
    const app = createTestApp(logger);

    await app.handle(new Request('http://localhost/error'));
    await tick();

    const errorLog = calls.find((c) => c.level === 'error');
    expect(errorLog).toBeDefined();

    const obj = errorLog!.args[0] as Record<string, unknown>;
    expect(obj).toHaveProperty('err');
  });
});
