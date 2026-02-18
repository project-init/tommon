import { describe, expect, test } from 'bun:test';
import { Env, isDevelopment, isNonDevelopment } from '.';

describe('Env', () => {
  test('string values match and development detection works', () => {
    expect(Env.Development).toBe('development');
    expect(Env.Staging).toBe('staging');
    expect(Env.Production).toBe('production');

    expect(isDevelopment(Env.Development)).toBe(true);
    expect(isDevelopment(Env.Staging)).toBe(false);
    expect(isDevelopment(Env.Production)).toBe(false);

    expect(isNonDevelopment(Env.Development)).toBe(false);
    expect(isNonDevelopment(Env.Staging)).toBe(true);
    expect(isNonDevelopment(Env.Production)).toBe(true);
  });
});
