import pino from 'pino';
import type { LoggingConfig } from '../cfg';

export interface Logger {
  debug(msg: string): void;
  debug(obj: Record<string, unknown>, msg: string): void;

  info(msg: string): void;
  info(obj: Record<string, unknown>, msg: string): void;

  warn(msg: string): void;
  warn(obj: Record<string, unknown>, msg: string): void;

  error(msg: string): void;
  error(obj: Record<string, unknown>, msg: string): void;

  child(bindings: Record<string, unknown>): Logger;
}

function createLogMethod(pinoMethod: pino.LogFn): {
  (msg: string): void;
  (obj: Record<string, unknown>, msg: string): void;
} {
  return (objOrMsg: Record<string, unknown> | string, msg?: string): void => {
    if (typeof objOrMsg === 'string') {
      pinoMethod(objOrMsg);
    } else {
      pinoMethod(objOrMsg, msg!);
    }
  };
}

function wrapPinoLogger(pinoLogger: pino.Logger): Logger {
  return {
    debug: createLogMethod(pinoLogger.debug.bind(pinoLogger)),
    info: createLogMethod(pinoLogger.info.bind(pinoLogger)),
    warn: createLogMethod(pinoLogger.warn.bind(pinoLogger)),
    error: createLogMethod(pinoLogger.error.bind(pinoLogger)),
    child(bindings: Record<string, unknown>): Logger {
      return wrapPinoLogger(pinoLogger.child(bindings));
    },
  };
}

function createSourceMixin(): () => Record<string, unknown> {
  return () => {
    const stack = new Error().stack;
    if (stack) {
      const callerLine = stack.split('\n')[5]?.trim();
      if (callerLine) {
        const match = callerLine.match(/at\s+.+\s+\((.+):(\d+):(\d+)\)/);
        if (match) {
          return { source: `${match[1]}:${match[2]}` };
        }
        const matchSimple = callerLine.match(/at\s+(.+):(\d+):(\d+)/);
        if (matchSimple) {
          return { source: `${matchSimple[1]}:${matchSimple[2]}` };
        }
      }
    }
    return {};
  };
}

export function createLogger(config: LoggingConfig): Logger {
  const pinoOptions: pino.LoggerOptions = {
    level: config.level,
  };

  if (config.addSource) {
    pinoOptions.mixin = createSourceMixin();
  }

  const pinoInstance = pino(pinoOptions);

  return wrapPinoLogger(pinoInstance);
}
