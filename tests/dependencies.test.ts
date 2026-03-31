import { describe, it, expect, vi, beforeEach } from 'vitest';
import { checkCommand, checkDependencies, runCommand } from '../src/utils/dependencies.js';

type ExecCallback = (err: Error | null) => void;
type MockFn = ReturnType<typeof vi.fn>;

vi.mock('child_process', () => ({
  exec: vi.fn(),
  spawn: vi.fn(),
}));

describe('dependencies', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('checkCommand', () => {
    it('should return true when command exists', async () => {
      const cp = await import('child_process');
      (cp.exec as unknown as MockFn).mockImplementation((_cmd: string, cb: ExecCallback) => {
        cb(null);
      });
      const result = await checkCommand('ffmpeg');
      expect(result).toBe(true);
    });

    it('should return false when command does not exist', async () => {
      const cp = await import('child_process');
      (cp.exec as unknown as MockFn).mockImplementation((_cmd: string, cb: ExecCallback) => {
        cb(new Error('not found'));
      });
      const result = await checkCommand('nonexistent-command');
      expect(result).toBe(false);
    });
  });

  describe('checkDependencies', () => {
    it('should return ok=true when all dependencies are present', async () => {
      const cp = await import('child_process');
      (cp.exec as unknown as MockFn).mockImplementation((_cmd: string, cb: ExecCallback) => {
        cb(null);
      });
      const result = await checkDependencies();
      expect(result.ok).toBe(true);
      expect(result.missing).toHaveLength(0);
    });

    it('should return ok=false with missing ffmpeg', async () => {
      const cp = await import('child_process');
      (cp.exec as unknown as MockFn).mockImplementation((cmd: string, cb: ExecCallback) => {
        if (cmd.includes('ffmpeg')) cb(new Error('not found'));
        else cb(null);
      });
      const result = await checkDependencies();
      expect(result.ok).toBe(false);
      expect(result.missing).toContain('ffmpeg');
    });

    it('should return ok=false with missing yt-dlp', async () => {
      const cp = await import('child_process');
      (cp.exec as unknown as MockFn).mockImplementation((cmd: string, cb: ExecCallback) => {
        if (cmd.includes('yt-dlp')) cb(new Error('not found'));
        else cb(null);
      });
      const result = await checkDependencies();
      expect(result.ok).toBe(false);
      expect(result.missing).toContain('yt-dlp');
    });

    it('should return both missing when neither installed', async () => {
      const cp = await import('child_process');
      (cp.exec as unknown as MockFn).mockImplementation((_cmd: string, cb: ExecCallback) => {
        cb(new Error('not found'));
      });
      const result = await checkDependencies();
      expect(result.ok).toBe(false);
      expect(result.missing).toContain('ffmpeg');
      expect(result.missing).toContain('yt-dlp');
    });
  });

  describe('runCommand', () => {
    function makeMockProcess() {
      return {
        stdout: { on: vi.fn() },
        stderr: { on: vi.fn() },
        on: vi.fn(),
      };
    }

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
