import { Elysia } from 'elysia';
import type { Logger } from '../logging';

function pickReqFields(request: Request) {
  const url = new URL(request.url);
  return {
    method: request.method,
    path: url.pathname,
    query: url.search ? url.search.slice(1) : undefined,
    userAgent: request.headers.get('user-agent') ?? undefined,
  };
}

export function requestLogger(log: Logger) {
  return new Elysia({ name: 'tommon.request-logger' })
    .derive({ as: 'global' }, ({ request }) => {
      const reqId = request.headers.get('x-request-id') ?? Bun.randomUUIDv7();
      const start = performance.now();
      const req = pickReqFields(request);
      return {
        reqId,
        _reqStart: start,
        log: log.child({ reqId, req }),
      };
    })
    .onError({ as: 'global' }, (ctx) => {
      (ctx as Record<string, unknown>)._reqError = ctx.error;
    })
    .onAfterResponse({ as: 'global' }, (ctx) => {
      const reqLog = (ctx as Record<string, unknown>).log as Logger | undefined;
      const reqStart = (ctx as Record<string, unknown>)._reqStart as
        | number
        | undefined;
      if (!reqLog || !reqStart) return;
      const ms = Math.round((performance.now() - reqStart) * 100) / 100;
      const err = (ctx as Record<string, unknown>)._reqError;
      const status = (ctx.set.status as number | undefined) ?? (err ? 500 : 200);
      if (err) {
        reqLog.error({ res: { status }, ms, err }, 'request');
      } else {
        reqLog.debug({ res: { status }, ms }, 'request');
      }
    });
}
