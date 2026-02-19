import type { Env } from '../env';

export interface ServiceConfig {
  env: Env;
  region: string;
  version: string;
}

export enum LogLevel {
  Debug = 'debug',
  Info = 'info',
  Warn = 'warn',
  Error = 'error',
}

export interface LoggingConfig {
  level: LogLevel;
  addSource: boolean;
}
