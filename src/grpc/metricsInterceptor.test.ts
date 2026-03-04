import { Code, ConnectError } from '@connectrpc/connect';
import { afterEach, describe, expect, test } from 'bun:test';
import { register } from 'prom-client';
import { grpcMetricsInterceptor } from './metricsInterceptor';

// Prometheus metrics are process-global, so clear them between tests to keep
// each assertion independent and deterministic.
afterEach(() => {
  register.resetMetrics();
});

// Minimal mock request shape needed by the interceptor for service/method labels.
function makeMockReq() {
  return {
    service: { typeName: 'example.v1.ExampleService' },
    method: { name: 'GetExample' },
  } as any;
}

// Helper to fetch a single metric family by name from the Prometheus registry.
async function getMetric(name: string) {
  const metrics = await register.getMetricsAsJSON();
  return metrics.find((metric) => metric.name === name);
}

describe('grpcMetricsInterceptor', () => {
  // Verifies the success path: the interceptor should increment the counter and
  // record histogram samples with grpc_status="ok".
  test('records success with grpc_status=ok', async () => {
    const interceptor = grpcMetricsInterceptor(
      async () => ({ ok: true }) as any,
    );
    await interceptor(makeMockReq());

    const counter = await getMetric('grpc_client_requests_total');
    const counterEntry = counter?.values.find(
      (value) =>
        value.labels.grpc_service === 'example.v1.ExampleService' &&
        value.labels.grpc_method === 'GetExample' &&
        value.labels.grpc_status === 'ok',
    );

    expect(counterEntry).toBeDefined();
    expect(counterEntry?.value).toBe(1);

    const histogram = await getMetric('grpc_client_request_duration_seconds');
    const histogramEntry = histogram?.values.find(
      (value) => value.labels.grpc_status === 'ok',
    );

    expect(histogramEntry).toBeDefined();
  });

  // Verifies ConnectError handling: enum code should be converted into the
  // string enum name (for example, Unavailable) for metric labels.
  test('records ConnectError enum name status', async () => {
    const interceptor = grpcMetricsInterceptor(async () => {
      throw new ConnectError('unavailable', Code.Unavailable);
    });

    await expect(interceptor(makeMockReq())).rejects.toBeInstanceOf(
      ConnectError,
    );

    const counter = await getMetric('grpc_client_requests_total');
    const entry = counter?.values.find(
      (value) =>
        value.labels.grpc_service === 'example.v1.ExampleService' &&
        value.labels.grpc_method === 'GetExample' &&
        value.labels.grpc_status === 'Unavailable',
    );

    expect(entry).toBeDefined();
    expect(entry?.value).toBe(1);
  });

  // Verifies fallback behavior for non-Connect exceptions.
  test('records unknown status for non-Connect errors', async () => {
    const interceptor = grpcMetricsInterceptor(async () => {
      throw new Error('a_non_grpc_error');
    });

    await expect(interceptor(makeMockReq())).rejects.toThrow(
      'a_non_grpc_error',
    );

    const counter = await getMetric('grpc_client_requests_total');
    const entry = counter?.values.find(
      (value) =>
        value.labels.grpc_service === 'example.v1.ExampleService' &&
        value.labels.grpc_method === 'GetExample' &&
        value.labels.grpc_status === 'unknown',
    );

    expect(entry).toBeDefined();
    expect(entry?.value).toBe(1);
  });
});
