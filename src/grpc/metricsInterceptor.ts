import type { Interceptor } from '@connectrpc/connect';
import { ConnectError } from '@connectrpc/connect';
import { Counter, Histogram } from 'prom-client';

// Tracks latency for each outbound gRPC call. The timer starts before the
// request and is completed in both success and error paths.
const grpcDuration = new Histogram({
  name: 'grpc_client_request_duration_seconds',
  help: 'Duration of outbound gRPC requests in seconds',
  labelNames: ['grpc_service', 'grpc_method', 'grpc_status'],
});

// Counts total outbound gRPC calls, split by service/method and final status.
const grpcTotal = new Counter({
  name: 'grpc_client_requests_total',
  help: 'Total outbound gRPC requests',
  labelNames: ['grpc_service', 'grpc_method', 'grpc_status'],
});

export const grpcMetricsInterceptor: Interceptor = (next) => async (req) => {
  // Pull service + method labels from the generated Connect request metadata.
  const service = req.service.typeName;
  const method = req.method.name;

  // startTimer returns a function we call later with the final status label.
  // Prometheus then records the elapsed seconds in grpcDuration.
  const end = grpcDuration.startTimer({
    grpc_service: service,
    grpc_method: method,
  });

  try {
    // Run the next interceptor (or transport) and mark a successful call.
    const res = await next(req);
    end({ grpc_status: 'ok' });
    grpcTotal.inc({
      grpc_service: service,
      grpc_method: method,
      grpc_status: 'ok',
    });
    return res;
  } catch (err) {
    // Convert ConnectError codes into a stable status label. For non-Connect
    // errors, tag as unknown so failures are still observable.
    const status =
      err instanceof ConnectError ? err.code.toString() : 'unknown';
    end({ grpc_status: status });
    grpcTotal.inc({
      grpc_service: service,
      grpc_method: method,
      grpc_status: status,
    });
    throw err;
  }
};
