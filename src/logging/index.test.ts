import { describe, expect, test } from 'bun:test';
import { createLogger } from '.';
import { LogLevel } from '../cfg';
import type { LoggingConfig } from '../cfg';

describe('createLogger', () => {
  test('returns a Logger with all expected methods', () => {
    const config: LoggingConfig = { level: LogLevel.Debug, addSource: false };
    const logger = createLogger(config);

    expect(typeof logger.debug).toBe('function');
    expect(typeof logger.info).toBe('function');
    expect(typeof logger.warn).toBe('function');
    expect(typeof logger.error).toBe('function');
    expect(typeof logger.child).toBe('function');
  });

  test('does not throw when logging with string only', () => {
    const config: LoggingConfig = { level: LogLevel.Debug, addSource: false };
    const logger = createLogger(config);

    expect(() => logger.debug('debug message')).not.toThrow();
    expect(() => logger.info('info message')).not.toThrow();
    expect(() => logger.warn('warn message')).not.toThrow();
    expect(() => logger.error('error message')).not.toThrow();
  });

  test('does not throw when logging with object and string', () => {
    const config: LoggingConfig = { level: LogLevel.Debug, addSource: false };
    const logger = createLogger(config);

    expect(() => logger.info({ userId: '123' }, 'user action')).not.toThrow();
    expect(() => logger.error({ code: 500 }, 'server error')).not.toThrow();
  });

  test('respects log level configuration', () => {
    const config: LoggingConfig = { level: LogLevel.Error, addSource: false };
    const logger = createLogger(config);

    expect(() => logger.debug('suppressed')).not.toThrow();
    expect(() => logger.info('suppressed')).not.toThrow();
    expect(() => logger.warn('suppressed')).not.toThrow();
    expect(() => logger.error('visible')).not.toThrow();
  });
});

describe('child logger', () => {
  test('returns a Logger with all expected methods', () => {
    const config: LoggingConfig = { level: LogLevel.Debug, addSource: false };
    const logger = createLogger(config);
    const child = logger.child({ module: 'users' });

    expect(typeof child.debug).toBe('function');
    expect(typeof child.info).toBe('function');
    expect(typeof child.warn).toBe('function');
    expect(typeof child.error).toBe('function');
    expect(typeof child.child).toBe('function');
  });

  test('child of child works', () => {
    const config: LoggingConfig = { level: LogLevel.Info, addSource: false };
    const logger = createLogger(config);
    const child = logger.child({ module: 'users' });
    const grandchild = child.child({ operation: 'create' });

    expect(() => grandchild.info('nested child log')).not.toThrow();
  });
});

describe('addSource', () => {
  test('does not throw when addSource is true', () => {
    const config: LoggingConfig = { level: LogLevel.Debug, addSource: true };
    const logger = createLogger(config);

    expect(() => logger.info('with source')).not.toThrow();
  });
});
