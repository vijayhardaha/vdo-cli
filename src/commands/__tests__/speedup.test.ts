import { Command } from 'commander';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { setupSpeedup, speedupAction } from '../speedup';

vi.mock('../../utils/dependencies', () => {
  const mockCheckDependencies = vi.fn();
  const mockEnsureDependencies = vi.fn(async () => {
    const deps = await mockCheckDependencies();
    if (!deps.ok) {
      process.exit(1);
    }
    return true;
  });
  return { checkDependencies: mockCheckDependencies, ensureDependencies: mockEnsureDependencies, runCommand: vi.fn() };
});

vi.mock('../../utils/ffmpeg', () => ({ speedUpVideo: vi.fn(), getVideoDuration: vi.fn(() => Promise.resolve(60)) }));

vi.mock('../../utils/validations', () => ({ validateFileExists: vi.fn(), validateSpeedRate: vi.fn() }));

vi.mock('../../utils/progress', () => ({
  createProgressBar: vi.fn(),
  formatFileSize: vi.fn(() => ({ value: 100, unit: 'MB' })),
}));

vi.mock('fs/promises', () => ({ access: vi.fn().mockRejectedValue(new Error('File not found')) }));

vi.mock('../../utils/prompt', () => ({
  checkAndPromptOverwrite: vi.fn().mockResolvedValue(true),
  promptOverwrite: vi.fn().mockResolvedValue(true),
}));

/* Mock progress bar */
const mockProgressBar = { start: vi.fn(), stop: vi.fn(), update: vi.fn() };

// Tests for speedup command
describe('speedup command', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Tests for setupSpeedup
  describe('setupSpeedup', () => {
    let program: Command;

    beforeEach(() => {
      program = new Command();
    });

    // Should register speedup command with correct options
    it('should register speedup command with correct options', () => {
      setupSpeedup(program);
      const commands = program.commands;

      expect(commands).toHaveLength(1);
      expect(commands[0]?.name()).toBe('speedup');
      expect(commands[0]?.aliases()).toContain('sup');
    });

    // Should have rate option
    it('should have rate option', () => {
      setupSpeedup(program);
      const cmd = program.commands[0];
      const rateOption = cmd?.options.find((opt) => opt.long === '--rate');

      expect(rateOption).toBeDefined();
    });
  });

  // Tests for speedupAction
  describe('speedupAction', () => {
    // Should should exit when dependencies missing
    it('should exit when dependencies missing', async () => {
      const { checkDependencies } = await import('../../utils/dependencies');

      vi.mocked(checkDependencies).mockResolvedValue({ ok: false, missing: ['ffmpeg'] });

      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

      await speedupAction('input.mp4', {});

      // Expect process.exit is called with 1
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    // Should should speed up video with default rate
    it('should speed up video with default rate', async () => {
      const { checkDependencies } = await import('../../utils/dependencies');
      const { validateFileExists, validateSpeedRate } = await import('../../utils/validations');
      const { speedUpVideo } = await import('../../utils/ffmpeg');
      const { createProgressBar } = await import('../../utils/progress');

      vi.mocked(checkDependencies).mockResolvedValue({ ok: true, missing: [] });
      vi.mocked(validateFileExists).mockResolvedValue(undefined);
      vi.mocked(validateSpeedRate).mockReturnValue(undefined);
      vi.mocked(speedUpVideo).mockResolvedValue(undefined);
      vi.mocked(createProgressBar).mockReturnValue(mockProgressBar as never);

      await speedupAction('input.mp4', {});

      // Expect speedUpVideo is called
      expect(speedUpVideo).toHaveBeenCalled();
    });

    // Should should use provided output option
    it('should use provided output option', async () => {
      const { checkDependencies } = await import('../../utils/dependencies');
      const { validateFileExists, validateSpeedRate } = await import('../../utils/validations');
      const { speedUpVideo } = await import('../../utils/ffmpeg');
      const { createProgressBar } = await import('../../utils/progress');

      vi.mocked(checkDependencies).mockResolvedValue({ ok: true, missing: [] });
      vi.mocked(validateFileExists).mockResolvedValue(undefined);
      vi.mocked(validateSpeedRate).mockReturnValue(undefined);
      vi.mocked(speedUpVideo).mockResolvedValue(undefined);
      vi.mocked(createProgressBar).mockReturnValue(mockProgressBar as never);

      await speedupAction('input.mp4', { output: 'out_fast.mp4', rate: 2 });

      // Expect speedUpVideo is called with custom output
      const callArgs = vi.mocked(speedUpVideo).mock.calls[0];
      expect(callArgs?.[1]).toBe('out_fast.mp4');
    });

    // Should should invoke progressCallback
    it('should invoke progressCallback', async () => {
      const { checkDependencies } = await import('../../utils/dependencies');
      const { validateFileExists, validateSpeedRate } = await import('../../utils/validations');
      const { speedUpVideo } = await import('../../utils/ffmpeg');
      const { createProgressBar } = await import('../../utils/progress');

      vi.mocked(checkDependencies).mockResolvedValue({ ok: true, missing: [] });
      vi.mocked(validateFileExists).mockResolvedValue(undefined);
      vi.mocked(validateSpeedRate).mockReturnValue(undefined);
      vi.mocked(createProgressBar).mockReturnValue(mockProgressBar as never);
      vi.mocked(speedUpVideo).mockImplementation(async (_i, _o, _r, onProgress) => {
        if (onProgress) onProgress(80, 48, 60);
      });

      await speedupAction('input.mp4', { rate: 2 });

      // Expect progress bar is updated
      expect(mockProgressBar.update).toHaveBeenCalledWith(80);
    });

    // Should should not update progress bar when percentage is 0
    it('should not update progress bar when percentage is 0', async () => {
      const { checkDependencies } = await import('../../utils/dependencies');
      const { validateFileExists, validateSpeedRate } = await import('../../utils/validations');
      const { speedUpVideo } = await import('../../utils/ffmpeg');
      const { createProgressBar } = await import('../../utils/progress');

      vi.mocked(checkDependencies).mockResolvedValue({ ok: true, missing: [] });
      vi.mocked(validateFileExists).mockResolvedValue(undefined);
      vi.mocked(validateSpeedRate).mockReturnValue(undefined);
      vi.mocked(createProgressBar).mockReturnValue(mockProgressBar as never);
      vi.mocked(speedUpVideo).mockImplementation(async (_i, _o, _r, onProgress) => {
        if (onProgress) onProgress(0, 0, 60);
      });

      await speedupAction('input.mp4', { rate: 2 });

      // Expect progress bar update is not called
      expect(mockProgressBar.update).not.toHaveBeenCalled();
    });

    // Should should not log faster or slower when rate is 1
    it('should not log faster or slower when rate is 1', async () => {
      const { checkDependencies } = await import('../../utils/dependencies');
      const { validateFileExists, validateSpeedRate } = await import('../../utils/validations');
      const { speedUpVideo } = await import('../../utils/ffmpeg');
      const { createProgressBar } = await import('../../utils/progress');

      vi.mocked(checkDependencies).mockResolvedValue({ ok: true, missing: [] });
      vi.mocked(validateFileExists).mockResolvedValue(undefined);
      vi.mocked(validateSpeedRate).mockReturnValue(undefined);
      vi.mocked(speedUpVideo).mockResolvedValue(undefined);
      vi.mocked(createProgressBar).mockReturnValue(mockProgressBar as never);

      await speedupAction('input.mp4', { rate: 1 });

      const consoleCalls = vi.mocked(console.log).mock.calls.map((c: unknown[]) => String(c[0]));

      // Expect console.log is not called with 'faster' or 'slower'
      expect(consoleCalls.some((m: string) => m?.includes('faster'))).toBe(false);
      expect(consoleCalls.some((m: string) => m?.includes('slower'))).toBe(false);
    });

    // Should should handle errors and exit 1
    it('should handle errors and exit 1', async () => {
      const { checkDependencies } = await import('../../utils/dependencies');
      const { validateFileExists } = await import('../../utils/validations');

      vi.mocked(checkDependencies).mockResolvedValue({ ok: true, missing: [] });
      vi.mocked(validateFileExists).mockRejectedValue(new Error('File not found'));

      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

      await speedupAction('input.mp4', {});

      // Expect process.exit is called with 1
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    // Should should handle non-Error thrown values
    it('should handle non-Error thrown values', async () => {
      const { checkDependencies } = await import('../../utils/dependencies');
      const { validateFileExists } = await import('../../utils/validations');

      vi.mocked(checkDependencies).mockResolvedValue({ ok: true, missing: [] });
      vi.mocked(validateFileExists).mockRejectedValue('string error');

      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

      await speedupAction('input.mp4', {});

      // Expect process.exit is called with 1
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    // Should should exit when validateSpeedRate throws error
    it('should exit when validateSpeedRate throws error', async () => {
      const { checkDependencies } = await import('../../utils/dependencies');
      const { validateFileExists, validateSpeedRate } = await import('../../utils/validations');

      vi.mocked(checkDependencies).mockResolvedValue({ ok: true, missing: [] });
      vi.mocked(validateFileExists).mockResolvedValue(undefined);
      vi.mocked(validateSpeedRate).mockImplementation(() => {
        throw new Error('Invalid speed rate');
      });

      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

      await speedupAction('input.mp4', {});

      // Expect process.exit is called with 1
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    // Should should handle speedUpVideo errors and exit 1
    it('should handle speedUpVideo errors and exit 1', async () => {
      const { checkDependencies } = await import('../../utils/dependencies');
      const { validateFileExists, validateSpeedRate } = await import('../../utils/validations');
      const { speedUpVideo } = await import('../../utils/ffmpeg');
      const { createProgressBar } = await import('../../utils/progress');

      vi.mocked(checkDependencies).mockResolvedValue({ ok: true, missing: [] });
      vi.mocked(validateFileExists).mockResolvedValue(undefined);
      vi.mocked(validateSpeedRate).mockReturnValue(undefined);
      vi.mocked(speedUpVideo).mockRejectedValue(new Error('Speed adjustment failed'));
      vi.mocked(createProgressBar).mockReturnValue(mockProgressBar as never);

      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

      await speedupAction('input.mp4', {});

      // Expect progress bar is stopped and process exits with 1
      expect(mockProgressBar.stop).toHaveBeenCalled();
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    // Should should handle non-Error thrown values in outer catch
    it('should handle non-Error thrown values in outer catch', async () => {
      const { checkDependencies } = await import('../../utils/dependencies');

      vi.mocked(checkDependencies).mockRejectedValue('unknown error');

      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

      await speedupAction('input.mp4', {});

      // Expect process.exit is called with 1
      expect(exitSpy).toHaveBeenCalledWith(1);
    });
  });
});
