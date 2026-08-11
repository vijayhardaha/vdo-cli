import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { info, success, warning, error, loading } from '../icons';
import { log, handleError } from '../log';

describe('log utility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('succeed should log success icon and message', () => {
    const message = 'Operation successful';
    log.succeed(message);
    expect(console.log).toHaveBeenCalledWith(`${success} ${message}`);
  });

  it('fail should log error icon and message', () => {
    const message = 'Operation failed';
    log.fail(message);
    expect(console.log).toHaveBeenCalledWith(`${error} ${message}`);
  });

  it('warn should log warning icon and message', () => {
    const message = 'Potential issue detected';
    log.warn(message);
    expect(console.log).toHaveBeenCalledWith(`${warning} ${message}`);
  });

  it('info should log info icon and message', () => {
    const message = 'Additional information';
    log.info(message);
    expect(console.log).toHaveBeenCalledWith(`${info} ${message}`);
  });

  it('loading should log loading icon and message', () => {
    const message = 'Processing...';
    log.loading(message);
    expect(console.log).toHaveBeenCalledWith(`${loading} ${message}`);
  });
});

describe('handleError', () => {
  let exitSpy: any; // eslint-disable-line @typescript-eslint/no-explicit-any

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
      return undefined as never;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should log error and exit when provided with an Error object', () => {
    const err = new Error('Something went wrong');
    (handleError as (error: unknown, prefix?: string) => void)(err);
    expect(console.log).toHaveBeenCalledWith(`${error} Something went wrong`);
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('should log error and exit when provided with a string', () => {
    const errMsg = 'Generic string error';
    (handleError as (error: unknown, prefix?: string) => void)(errMsg);
    expect(console.log).toHaveBeenCalledWith(`${error} Generic string error`);
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('should log error with prefix and exit', () => {
    const err = new Error('Disk full');
    const prefix = 'Storage Error: ';
    (handleError as (error: unknown, prefix?: string) => void)(err, prefix);
    expect(console.log).toHaveBeenCalledWith(`${error} Storage Error: Disk full`);
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('should log string error with prefix and exit', () => {
    const errMsg = 'Network timeout';
    const prefix = 'Connection Error: ';
    (handleError as (error: unknown, prefix?: string) => void)(errMsg, prefix);
    expect(console.log).toHaveBeenCalledWith(`${error} Connection Error: Network timeout`);
    expect(exitSpy).toHaveBeenCalledWith(1);
  });
});
