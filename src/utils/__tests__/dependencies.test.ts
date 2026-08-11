import os from 'node:os';

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { runCommand, ensureDependencies } from '@/utils/dependencies';
import { log } from '@/utils/log';

type MockFn = ReturnType<typeof vi.fn>;

vi.mock('child_process', () => ({ exec: vi.fn(), spawn: vi.fn() }));
vi.mock('@/utils/log', () => ({
  log: { fail: vi.fn(), warn: vi.fn(), info: vi.fn(), succeed: vi.fn(), loading: vi.fn() },
}));

// Tests for dependency utility functions
describe('dependencies', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Tests for runCommand function
  describe('runCommand', () => {
    function makeMockProcess() {
      return { stdout: { on: vi.fn() }, stderr: { on: vi.fn() }, on: vi.fn() };
    }

    // Should resolve with stdout and stderr on exit code 0
    it('should resolve with stdout and stderr on exit code 0', async () => {
      const cp = await import('child_process');
      const mock = makeMockProcess();

      (cp.spawn as unknown as MockFn).mockReturnValue(mock);
      mock.stdout.on.mockImplementation((e: string, cb: (d: Buffer) => void) => {
        if (e === 'data') cb(Buffer.from('hello output'));
      });
      mock.stderr.on.mockImplementation((e: string, cb: (d: Buffer) => void) => {
        if (e === 'data') cb(Buffer.from('some warning'));
      });
      mock.on.mockImplementation((e: string, cb: (code: number) => void) => {
        if (e === 'close') cb(0);
      });

      const result = await runCommand('echo hello');

      expect(result.stdout).toBe('hello output');
      expect(result.stderr).toBe('some warning');
    });

    // Should call onOutput callback for stdout and stderr
    it('should call onOutput callback for stdout and stderr', async () => {
      const cp = await import('child_process');
      const mock = makeMockProcess();

      (cp.spawn as unknown as MockFn).mockReturnValue(mock);

      mock.stdout.on.mockImplementation((e: string, cb: (d: Buffer) => void) => {
        if (e === 'data') cb(Buffer.from('stdout line'));
      });
      mock.stderr.on.mockImplementation((e: string, cb: (d: Buffer) => void) => {
        if (e === 'data') cb(Buffer.from('stderr line'));
      });
      mock.on.mockImplementation((e: string, cb: (code: number) => void) => {
        if (e === 'close') cb(0);
      });

      const onOutput = vi.fn();
      await runCommand('echo hello', onOutput);

      expect(onOutput).toHaveBeenCalledWith('stdout line', 'stdout');
      expect(onOutput).toHaveBeenCalledWith('stderr line', 'stderr');
    });

    // Should reject when exit code is non-zero
    it('should reject when exit code is non-zero', async () => {
      const cp = await import('child_process');
      const mock = makeMockProcess();

      (cp.spawn as unknown as MockFn).mockReturnValue(mock);

      mock.stdout.on.mockImplementation(vi.fn());
      mock.stderr.on.mockImplementation((e: string, cb: (d: Buffer) => void) => {
        if (e === 'data') cb(Buffer.from('error output'));
      });
      mock.on.mockImplementation((e: string, cb: (code: number) => void) => {
        if (e === 'close') cb(1);
      });

      await expect(runCommand('failing-command')).rejects.toThrow('Command failed with code 1');
    });

    // Should reject on process error event
    it('should reject on process error event', async () => {
      const cp = await import('child_process');
      const mock = makeMockProcess();

      (cp.spawn as unknown as MockFn).mockReturnValue(mock);

      mock.stdout.on.mockImplementation(vi.fn());
      mock.stderr.on.mockImplementation(vi.fn());
      mock.on.mockImplementation((e: string, cb: (err: Error) => void) => {
        if (e === 'error') cb(new Error('spawn ENOENT'));
      });

      await expect(runCommand('bad-command')).rejects.toThrow('spawn ENOENT');
    });

    // Should work without onOutput callback (null)
    it('should work without onOutput callback (null)', async () => {
      const cp = await import('child_process');
      const mock = makeMockProcess();

      (cp.spawn as unknown as MockFn).mockReturnValue(mock);

      mock.stdout.on.mockImplementation((e: string, cb: (d: Buffer) => void) => {
        if (e === 'data') cb(Buffer.from('data'));
      });
      mock.stderr.on.mockImplementation((e: string, cb: (d: Buffer) => void) => {
        if (e === 'data') cb(Buffer.from('err'));
      });
      mock.on.mockImplementation((e: string, cb: (code: number) => void) => {
        if (e === 'close') cb(0);
      });

      const result = await runCommand('cmd', null);

      expect(result.stdout).toBe('data');
    });
  });

  // Tests for ensureDependencies function
  describe('ensureDependencies', () => {
    let exitSpy: any; // eslint-disable-line @typescript-eslint/no-explicit-any

    beforeEach(() => {
      exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
        return undefined as never;
      });
    });

    afterEach(() => {
      exitSpy.mockRestore();
    });

    it('should return true if all dependencies are installed', async () => {
      const cp = await import('child_process');
      // Mock exec to return no error for both ffmpeg and yt-dlp
      (cp.exec as unknown as MockFn).mockImplementation((_cmd, cb) => {
        cb(null);
      });

      const result = await ensureDependencies();
      expect(result).toBe(true);
      expect(exitSpy).not.toHaveBeenCalled();
    });

    it('should exit with 1 and log error if dependencies are missing', async () => {
      const cp = await import('child_process');
      // Mock exec to return error for both
      (cp.exec as unknown as MockFn).mockImplementation((_cmd, cb) => {
        cb(new Error('not found'));
      });

      await ensureDependencies();

      expect(log.fail).toHaveBeenCalledWith('Missing dependencies: ffmpeg, yt-dlp');
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    it('should log correct install command for darwin', async () => {
      const cp = await import('child_process');
      (cp.exec as unknown as MockFn).mockImplementation((_cmd, cb) => {
        cb(new Error('not found'));
      });
      vi.spyOn(os, 'platform').mockReturnValue('darwin');

      await ensureDependencies();

      expect(log.warn).toHaveBeenCalledWith('Install using: brew install ffmpeg yt-dlp');
    });

    it('should log correct install command for linux', async () => {
      const cp = await import('child_process');
      (cp.exec as unknown as MockFn).mockImplementation((_cmd, cb) => {
        cb(new Error('not found'));
      });
      vi.spyOn(os, 'platform').mockReturnValue('linux');

      await ensureDependencies();

      expect(log.warn).toHaveBeenCalledWith('Install using: sudo apt install ffmpeg yt-dlp');
    });

    it('should log correct install command for win32', async () => {
      const cp = await import('child_process');
      (cp.exec as unknown as MockFn).mockImplementation((_cmd, cb) => {
        cb(new Error('not found'));
      });
      vi.spyOn(os, 'platform').mockReturnValue('win32');

      await ensureDependencies();

      expect(log.warn).toHaveBeenCalledWith('Install using: winget install ffmpeg yt-dlp');
    });

    it('should log fallback install command for unknown platform', async () => {
      const cp = await import('child_process');
      (cp.exec as unknown as MockFn).mockImplementation((_cmd, cb) => {
        cb(new Error('not found'));
      });
      vi.spyOn(os, 'platform').mockReturnValue('unknown' as any); // eslint-disable-line @typescript-eslint/no-explicit-any

      await ensureDependencies();

      expect(log.warn).toHaveBeenCalledWith('Install using: install ffmpeg yt-dlp manually');
    });
  });
});
