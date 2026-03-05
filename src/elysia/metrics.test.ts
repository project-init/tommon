import { afterEach, describe, expect, test } from 'bun:test';
import { Elysia } from 'elysia';
import { register } from 'prom-client';
import { httpMetricsPlugin, metricsPlugin, normalizePath } from './metrics';

function tick() {
  return new Promise((resolve) => setTimeout(resolve, 10));
}

afterEach(() => {
  register.resetMetrics();
});

function createTestApp() {
  return new Elysia()
    .use(httpMetricsPlugin)
    .use(metricsPlugin)
    .get('/ok', () => 'ok')
    .get('/not-found', ({ set }) => {
      set.status = 404;
      return 'not found';
    })
    .post('/submit', () => 'created');
}

describe('httpMetricsPlugin', () => {
  test('increments http_requests_total counter', async () => {
    const app = createTestApp();

    await app.handle(new Request('http://localhost/ok'));
    await tick();

    const metrics = await register.getMetricsAsJSON();
    const counter = metrics.find((m) => m.name === 'http_requests_total');
    expect(counter).toBeDefined();
    expect(counter!.values).toContainEqual(
      expect.objectContaining({
        labels: { method: 'GET', route: '/ok', status_code: '200' },
        value: 1,
      }),
    );
  });

  test('records http_request_duration_seconds histogram', async () => {
    const app = createTestApp();

    await app.handle(new Request('http://localhost/ok'));
    await tick();

    const metrics = await register.getMetricsAsJSON();
    const histogram = metrics.find(
      (m) => m.name === 'http_request_duration_seconds',
    );
    expect(histogram).toBeDefined();
    expect(histogram!.values.length).toBeGreaterThan(0);
  });

  test('tracks different routes separately', async () => {
    const app = createTestApp();

    await app.handle(new Request('http://localhost/ok'));
    await app.handle(new Request('http://localhost/not-found'));
    await tick();

    const metrics = await register.getMetricsAsJSON();
    const counter = metrics.find((m) => m.name === 'http_requests_total');
    expect(counter).toBeDefined();

    const okEntry = counter!.values.find(
      (v) => v.labels.route === '/ok' && v.labels.status_code === '200',
    );
    const notFoundEntry = counter!.values.find(
      (v) => v.labels.route === '/not-found' && v.labels.status_code === '404',
    );
    expect(okEntry).toBeDefined();
    expect(notFoundEntry).toBeDefined();
  });

  test('tracks request method', async () => {
    const app = createTestApp();

    await app.handle(
      new Request('http://localhost/submit', { method: 'POST' }),
    );
    await tick();

    const metrics = await register.getMetricsAsJSON();
    const counter = metrics.find((m) => m.name === 'http_requests_total');
    const postEntry = counter!.values.find((v) => v.labels.method === 'POST');
    expect(postEntry).toBeDefined();
    expect(postEntry!.value).toBe(1);
  });

  test('increments counter on repeated requests', async () => {
    const app = createTestApp();

    await app.handle(new Request('http://localhost/ok'));
    await app.handle(new Request('http://localhost/ok'));
    await app.handle(new Request('http://localhost/ok'));
    await tick();

    const metrics = await register.getMetricsAsJSON();
    const counter = metrics.find((m) => m.name === 'http_requests_total');
    const entry = counter!.values.find(
      (v) => v.labels.route === '/ok' && v.labels.status_code === '200',
    );
    expect(entry!.value).toBe(3);
  });
});

describe('normalizePath', () => {
  test('replaces UUIDs with :id', () => {
    expect(normalizePath('/users/550e8400-e29b-41d4-a716-446655440000')).toBe(
      '/users/:id',
    );
  });

  test('replaces multiple UUIDs', () => {
    expect(
      normalizePath(
        '/orgs/550e8400-e29b-41d4-a716-446655440000/users/00000000-0000-0000-0000-000000000001',
      ),
    ).toBe('/orgs/:id/users/:id');
  });

  test('replaces numeric IDs', () => {
    expect(normalizePath('/users/123')).toBe('/users/:id');
    expect(normalizePath('/orders/456/items/789')).toBe(
      '/orders/:id/items/:id',
    );
  });

  test('does not replace partial numeric segments', () => {
    expect(normalizePath('/v1/login')).toBe('/v1/login');
    expect(normalizePath('/ui/v2/home')).toBe('/ui/v2/home');
  });

  test('does not replace non-ID alphanumeric segments', () => {
    expect(normalizePath('/users/123abc')).toBe('/users/123abc');
  });

  test('leaves static paths unchanged', () => {
    expect(normalizePath('/healthcheck')).toBe('/healthcheck');
    expect(normalizePath('/v1/auth/saml/login')).toBe('/v1/auth/saml/login');
    expect(normalizePath('/users')).toBe('/users');
    expect(normalizePath('/metrics')).toBe('/metrics');
  });

  test('handles UUID mid-path', () => {
    expect(
      normalizePath('/users/00000000-0000-0000-0000-000000000001/settings'),
    ).toBe('/users/:id/settings');
  });

  test('handles numeric ID mid-path', () => {
    expect(normalizePath('/users/123/settings')).toBe('/users/:id/settings');
  });
});

describe('metricsPlugin', () => {
  test('serves prometheus metrics at /metrics', async () => {
    const app = createTestApp();

    const res = await app.handle(new Request('http://localhost/metrics'));
    expect(res.status).toBe(200);

    const body = await res.text();
    expect(body).toContain('http_requests_total');
    expect(body).toContain('http_request_duration_seconds');
  });

  test('sets correct content-type header', async () => {
    const app = createTestApp();

    const res = await app.handle(new Request('http://localhost/metrics'));
    const contentType = res.headers.get('content-type');
    expect(contentType).toContain('text/plain');
  });
});
