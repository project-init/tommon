import type { Transport } from '@connectrpc/connect';
import {
  createGrpcTransport,
  type GrpcTransportOptions,
} from '@connectrpc/connect-node';
import { isDevelopment, type Env } from '../env';
import { grpcMetricsInterceptor } from './metricsInterceptor';

export function createGrpcTransportForEnv(
  host: string,
  env: Env,
  options?: Omit<GrpcTransportOptions, 'baseUrl'>,
): Transport {
  const baseUrl = isDevelopment(env) ? `http://${host}` : `https://${host}`;

  return createGrpcTransport({ baseUrl, ...options });
}

export { grpcMetricsInterceptor };
