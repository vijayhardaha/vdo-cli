import { info, success, warning, error, loading, text } from './icons.js';

export type LogType = 'succeed' | 'fail' | 'warn' | 'info' | 'spinner' | 'text';

export interface LogOutput {
  succeed(message: string): void;
  fail(message: string): void;
  warn(message: string): void;
  info(message: string): void;
  spinner(message: string): void;
  text(message: string): void;
}

export const log = {
  succeed: (message: string) => console.log(`${success} ${message}`),
  fail: (message: string) => console.log(`${error} ${message}`),
  warn: (message: string) => console.log(`${warning} ${message}`),
  info: (message: string) => console.log(`${info} ${message}`),
  spinner: (message: string) => console.log(`${loading} ${message}`),
  text: (message: string) => console.log(`${text} ${message}`),
};
