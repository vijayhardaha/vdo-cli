import { info, success, warning, error, loading } from '@/utils/icons';

/* Styled console logging utility using yoctocolors */
export const log = {
  succeed: (message: string) => console.log(`${success} ${message}`),
  fail: (message: string) => console.log(`${error} ${message}`),
  warn: (message: string) => console.log(`${warning} ${message}`),
  info: (message: string) => console.log(`${info} ${message}`),
  loading: (message: string) => console.log(`${loading} ${message}`),
};

/**
 * Log error message and exit process with code 1.
 *
 * @param {unknown} error - The error to handle.
 * @param {string} [prefix] - Optional prefix (e.g., 'Compact failed: ').
 *
 * @returns {never} Never returns - exits the process.
 */
export function handleError(error: unknown, prefix?: string): never {
  const msg = error instanceof Error ? error.message : String(error);
  log.fail(prefix ? `${prefix}${msg}` : msg);
  process.exit(1);
}
