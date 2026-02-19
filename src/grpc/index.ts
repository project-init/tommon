import type { Transport } from '@connectrpc/connect';
import { createGrpcTransport } from '@connectrpc/connect-node';
import { isDevelopment, type Env } from '../env';

export function createGrpcTransportForEnv(host: string, env: Env): Transport {
  const baseUrl = isDevelopment(env) ? `http://${host}` : `https://${host}`;

  return createGrpcTransport({ baseUrl });
}
