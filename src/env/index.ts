export const Env = {
  Development: 'development',
  Staging: 'staging',
  Production: 'production',
} as const;

export type Env = (typeof Env)[keyof typeof Env];

const validEnvs = new Set<string>(Object.values(Env));

export function parseEnv(value: string): Env {
  if (!validEnvs.has(value)) {
    throw new Error(
      `Invalid environment: "${value}". Must be one of: ${[...validEnvs].join(', ')}`,
    );
  }
  return value as Env;
}

export function isDevelopment(env: Env): boolean {
  return env === Env.Development;
}

export function isNonDevelopment(env: Env): boolean {
  return !isDevelopment(env);
}
