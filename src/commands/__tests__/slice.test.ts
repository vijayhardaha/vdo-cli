import { Command } from 'commander';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { setupSlice, sliceAction } from '../slice';

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

vi.mock('../../utils/slice', () => ({
  sliceVideoStreamCopy: vi.fn(),
  sliceVideoReencode: vi.fn(),
  sliceMultipleSegments: vi.fn(),
  formatTimeForFFmpeg: vi.fn((t) => t),
}));

vi.mock('../../utils/validations', () => ({ validateFileExists: vi.fn() }));

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

// Tests for slice command
describe('slice command', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Tests for setupSlice
  describe('setupSlice', () => {
    let program: Command;

    beforeEach(() => {
      program = new Command();
    });

    // Should register slice command with correct options
    it('should register slice command with correct options', () => {
      setupSlice(program);
      const commands = program.commands;

      expect(commands).toHaveLength(1);
      expect(commands[0]?.name()).toBe('slice');
      expect(commands[0]?.aliases()).toContain('slc');
    });

    // Should have start option
    it('should have start option', () => {
      setupSlice(program);
      const cmd = program.commands[0];
      const startOption = cmd?.options.find((opt) => opt.long === '--start');

      expect(startOption).toBeDefined();
    });

    // Should have end option
    it('should have end option', () => {
      setupSlice(program);
      const cmd = program.commands[0];
      const endOption = cmd?.options.find((opt) => opt.long === '--end');

      expect(endOption).toBeDefined();
    });

    // Should have fast option
    it('should have fast option', () => {
      setupSlice(program);
      const cmd = program.commands[0];
      const fastOption = cmd?.options.find((opt) => opt.long === '--fast');

      expect(fastOption).toBeDefined();
    });

    // Should have precise option
    it('should have precise option', () => {
      setupSlice(program);
      const cmd = program.commands[0];
      const preciseOption = cmd?.options.find((opt) => opt.long === '--precise');

      expect(preciseOption).toBeDefined();
    });

    // Should have segments option
    it('should have segments option', () => {
      setupSlice(program);
      const cmd = program.commands[0];
      const segmentsOption = cmd?.options.find((opt) => opt.long === '--segments');

      expect(segmentsOption).toBeDefined();
    });
  });

  // Tests for sliceAction
  describe('sliceAction', () => {
    // Should should exit when dependencies missing
    it('should exit when dependencies missing', async () => {
      const { checkDependencies } = await import('../../utils/dependencies');

      vi.mocked(checkDependencies).mockResolvedValue({ ok: false, missing: ['ffmpeg'] });

      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

      await sliceAction('input.mp4', { start: '10', end: '30' });

      // Expect process.exit is called with 1
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    // Should should exit when start/end not provided
    it('should exit when start/end not provided', async () => {
      const { checkDependencies } = await import('../../utils/dependencies');
      const { validateFileExists } = await import('../../utils/validations');

      vi.mocked(checkDependencies).mockResolvedValue({ ok: true, missing: [] });
      vi.mocked(validateFileExists).mockResolvedValue(undefined);

      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

      await sliceAction('input.mp4', {});

      // Expect process.exit is called with 1
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    // Should should exit when start provided but no end or duration
    it('should exit when start provided but no end or duration', async () => {
      const { checkDependencies } = await import('../../utils/dependencies');
      const { validateFileExists } = await import('../../utils/validations');

      vi.mocked(checkDependencies).mockResolvedValue({ ok: true, missing: [] });
      vi.mocked(validateFileExists).mockResolvedValue(undefined);

      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

      await sliceAction('input.mp4', { start: '10' });

      // Expect process.exit is called with 1
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    // Should should use stream copy in fast mode
    it('should use stream copy in fast mode', async () => {
      const { checkDependencies } = await import('../../utils/dependencies');
      const { validateFileExists } = await import('../../utils/validations');
      const { sliceVideoStreamCopy } = await import('../../utils/slice');
      const { createProgressBar } = await import('../../utils/progress');

      vi.mocked(checkDependencies).mockResolvedValue({ ok: true, missing: [] });
      vi.mocked(validateFileExists).mockResolvedValue(undefined);
      vi.mocked(createProgressBar).mockReturnValue(mockProgressBar as never);
      vi.mocked(sliceVideoStreamCopy).mockResolvedValue(undefined);

      await sliceAction('input.mp4', { start: '10', end: '30', fast: true });

      // Expect sliceVideoStreamCopy is called
      expect(sliceVideoStreamCopy).toHaveBeenCalled();
    });

    // Should should re-encode in precise mode
    it('should re-encode in precise mode', async () => {
      const { checkDependencies } = await import('../../utils/dependencies');
      const { validateFileExists } = await import('../../utils/validations');
      const { sliceVideoReencode } = await import('../../utils/slice');
      const { createProgressBar } = await import('../../utils/progress');

      vi.mocked(checkDependencies).mockResolvedValue({ ok: true, missing: [] });
      vi.mocked(validateFileExists).mockResolvedValue(undefined);
      vi.mocked(createProgressBar).mockReturnValue(mockProgressBar as never);
      vi.mocked(sliceVideoReencode).mockResolvedValue(undefined);

      await sliceAction('input.mp4', { start: '10', end: '30', precise: true });

      // Expect sliceVideoReencode is called
      expect(sliceVideoReencode).toHaveBeenCalled();
    });

    // Should should use auto mode (stream copy) by default
    it('should use auto mode (stream copy) by default', async () => {
      const { checkDependencies } = await import('../../utils/dependencies');
      const { validateFileExists } = await import('../../utils/validations');
      const { sliceVideoStreamCopy } = await import('../../utils/slice');
      const { createProgressBar } = await import('../../utils/progress');

      vi.mocked(checkDependencies).mockResolvedValue({ ok: true, missing: [] });
      vi.mocked(validateFileExists).mockResolvedValue(undefined);
      vi.mocked(createProgressBar).mockReturnValue(mockProgressBar as never);
      vi.mocked(sliceVideoStreamCopy).mockResolvedValue(undefined);

      await sliceAction('input.mp4', { start: '10', end: '30' });

      // Expect sliceVideoStreamCopy is called (auto default)
      expect(sliceVideoStreamCopy).toHaveBeenCalled();
    });

    // Should should use duration instead of end time
    it('should use duration instead of end time', async () => {
      const { checkDependencies } = await import('../../utils/dependencies');
      const { validateFileExists } = await import('../../utils/validations');
      const { sliceVideoStreamCopy } = await import('../../utils/slice');
      const { createProgressBar } = await import('../../utils/progress');

      vi.mocked(checkDependencies).mockResolvedValue({ ok: true, missing: [] });
      vi.mocked(validateFileExists).mockResolvedValue(undefined);
      vi.mocked(createProgressBar).mockReturnValue(mockProgressBar as never);
      vi.mocked(sliceVideoStreamCopy).mockResolvedValue(undefined);

      await sliceAction('input.mp4', { start: '10', duration: '20' });

      // Expect sliceVideoStreamCopy is called with duration-based end time
      expect(sliceVideoStreamCopy).toHaveBeenCalled();
    });

    // Should should handle segments path
    it('should handle segments path', async () => {
      const { checkDependencies } = await import('../../utils/dependencies');
      const { validateFileExists } = await import('../../utils/validations');
      const { sliceMultipleSegments } = await import('../../utils/slice');
      const { createProgressBar } = await import('../../utils/progress');

      vi.mocked(checkDependencies).mockResolvedValue({ ok: true, missing: [] });
      vi.mocked(validateFileExists).mockResolvedValue(undefined);
      vi.mocked(createProgressBar).mockReturnValue(mockProgressBar as never);
      vi.mocked(sliceMultipleSegments).mockResolvedValue([]);

      await sliceAction('/path/to/video.mp4', {
        segments: [
          { start: '0', end: '10' },
          { start: '30', end: '45' },
        ],
      });

      // Expect sliceMultipleSegments is called
      expect(sliceMultipleSegments).toHaveBeenCalled();
    });

    // Should should exit when user declines overwrite
    it('should exit when user declines overwrite', async () => {
      const { checkDependencies } = await import('../../utils/dependencies');
      const { validateFileExists } = await import('../../utils/validations');
      const { checkAndPromptOverwrite } = await import('../../utils/prompt');

      vi.mocked(checkDependencies).mockResolvedValue({ ok: true, missing: [] });
      vi.mocked(validateFileExists).mockResolvedValue(undefined);
      vi.mocked(checkAndPromptOverwrite).mockResolvedValue(false);

      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

      await sliceAction('input.mp4', { start: '10', end: '30' });

      // Expect process.exit is called with 0
      expect(exitSpy).toHaveBeenCalledWith(0);
    });

    // Should should handle thrown errors in slice functions
    it('should handle thrown errors in slice functions', async () => {
      const { checkDependencies } = await import('../../utils/dependencies');
      const { validateFileExists } = await import('../../utils/validations');
      const { sliceVideoStreamCopy } = await import('../../utils/slice');
      const { createProgressBar } = await import('../../utils/progress');

      vi.mocked(checkDependencies).mockResolvedValue({ ok: true, missing: [] });
      vi.mocked(validateFileExists).mockResolvedValue(undefined);
      vi.mocked(createProgressBar).mockReturnValue(mockProgressBar as never);
      vi.mocked(sliceVideoStreamCopy).mockRejectedValue(new Error('slice error'));

      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

      await sliceAction('input.mp4', { start: '10', end: '30' });

      // Expect process.exit is called with 1
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    // Should should handle non-Error thrown values in outer catch
    it('should handle non-Error thrown values in outer catch', async () => {
      const { checkDependencies } = await import('../../utils/dependencies');

      vi.mocked(checkDependencies).mockRejectedValue('unknown error');

      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

      await sliceAction('input.mp4', { start: '10', end: '30' });

      // Expect process.exit is called with 1
      expect(exitSpy).toHaveBeenCalledWith(1);
    });
  });
});
