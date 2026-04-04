import { info, success, warning, error, loading } from './icons.js';

export type LogType = 'succeed' | 'fail' | 'warn' | 'info' | 'loading';

export interface LogOutput {
  succeed(message: string): void;
  fail(message: string): void;
  warn(message: string): void;
  info(message: string): void;
  loading(message: string): void;
}

export const log = {
  succeed: (message: string) => console.log(`${success} ${message}`),
  fail: (message: string) => console.log(`${error} ${message}`),
  warn: (message: string) => console.log(`${warning} ${message}`),
  info: (message: string) => console.log(`${info} ${message}`),
  loading: (message: string) => console.log(`${loading} ${message}`),
};
