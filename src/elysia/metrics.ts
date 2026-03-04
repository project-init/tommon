import { Elysia } from 'elysia';
import {
  collectDefaultMetrics,
  Counter,
  Histogram,
  register,
} from 'prom-client';

collectDefaultMetrics();

const httpRequestsTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'] as const,
});

const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route', 'status_code'] as const,
  // Subset of gommon's buckets (converted from ms to seconds) to limit cardinality.
  buckets: [0.01, 0.05, 0.25, 1, 5],
});

export const httpMetricsPlugin = new Elysia({ name: 'http-metrics' })
  .derive({ as: 'global' }, () => ({
    _metricsStart: performance.now(),
  }))
  .onAfterResponse({ as: 'global' }, ({ request, set, path, ...ctx }) => {
    const startTime = (ctx as Record<string, unknown>)._metricsStart as number;
    const duration = (performance.now() - startTime) / 1000;
    const method = request.method;
    const statusCode = String(set.status || 200);

    httpRequestsTotal.inc({ method, route: path, status_code: statusCode });
    httpRequestDuration.observe(
      { method, route: path, status_code: statusCode },
      duration,
    );
  });

export const metricsPlugin = new Elysia({
  name: 'metrics',
}).get('/metrics', async ({ set }) => {
  set.headers['content-type'] = register.contentType;
  return register.metrics();
});
