import { describe, it, expect, vi, beforeEach } from 'vitest';

import { runCommand } from '@/utils/dependencies';

type MockFn = ReturnType<typeof vi.fn>;

vi.mock('child_process', () => ({ exec: vi.fn(), spawn: vi.fn() }));

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
});
