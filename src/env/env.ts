export const Env = {
  Development: 'development',
  Staging: 'staging',
  Production: 'production',
} as const;

export type Env = (typeof Env)[keyof typeof Env];

export function isDevelopment(env: Env): boolean {
  return env === Env.Development;
}

export function isNonDevelopment(env: Env): boolean {
  return !isDevelopment(env);
}
