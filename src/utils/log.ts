import { info, success, warning, error, loading } from '@/utils/icons';

/* Log message types for styled console output */
export type LogType = 'succeed' | 'fail' | 'warn' | 'info' | 'loading';

/* Log output interface with all available logging methods */
export interface LogOutput {
  succeed(message: string): void;
  fail(message: string): void;
  warn(message: string): void;
  info(message: string): void;
  loading(message: string): void;
}

/* Styled console logging utility using yoctocolors */
export const log = {
  succeed: (message: string) => console.log(`${success} ${message}`),
  fail: (message: string) => console.log(`${error} ${message}`),
  warn: (message: string) => console.log(`${warning} ${message}`),
  info: (message: string) => console.log(`${info} ${message}`),
  loading: (message: string) => console.log(`${loading} ${message}`),
};
