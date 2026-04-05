import { Command } from 'commander';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { setupSplit, splitAction } from '../split.js';

vi.mock('../../utils/dependencies.js', () => ({ checkDependencies: vi.fn(), runCommand: vi.fn() }));

vi.mock('../../utils/split.js', () => ({
  splitVideoReencode: vi.fn(() => Promise.resolve(['output_001.mp4', 'output_002.mp4'])),
  splitVideoStreamCopy: vi.fn(() => Promise.resolve(['output_001.mp4', 'output_002.mp4'])),
  parseDuration: vi.fn(),
  getPresetDuration: vi.fn(),
  calculateNumParts: vi.fn(),
}));

vi.mock('../../utils/validations.js', () => ({ validateFileExists: vi.fn() }));

vi.mock('../../utils/ffmpeg.js', () => ({ getVideoDuration: vi.fn() }));

vi.mock('../../utils/progress.js', () => ({
  createProgressBar: vi.fn(),
  formatFileSize: vi.fn(() => ({ value: 100, unit: 'MB' })),
}));

vi.mock('fs/promises', () => ({ access: vi.fn().mockRejectedValue(new Error('File not found')) }));

vi.mock('../../utils/prompt.js', () => ({
  checkAndPromptOverwrite: vi.fn().mockResolvedValue(true),
  promptOverwrite: vi.fn().mockResolvedValue(true),
}));

/* Mock progress bar */
const mockProgressBar = { start: vi.fn(), stop: vi.fn(), update: vi.fn() };

// Tests for split command
describe('split command', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Tests for setupSplit
  describe('setupSplit', () => {
    let program: Command;

    beforeEach(() => {
      program = new Command();
    });

    // Should register split command with correct options
    it('should register split command with correct options', () => {
      setupSplit(program);
      const commands = program.commands;

      expect(commands).toHaveLength(1);
      expect(commands[0]?.name()).toBe('split');
      expect(commands[0]?.aliases()).toContain('spl');
    });

    // Should have preset option
    it('should have preset option', () => {
      setupSplit(program);
      const cmd = program.commands[0];
      const presetOption = cmd?.options.find((opt) => opt.long === '--preset');

      expect(presetOption).toBeDefined();
    });

    // Should have duration option
    it('should have duration option', () => {
      setupSplit(program);
      const cmd = program.commands[0];
      const durationOption = cmd?.options.find((opt) => opt.long === '--duration');

      expect(durationOption).toBeDefined();
    });

    // Should have fast option
    it('should have fast option', () => {
      setupSplit(program);
      const cmd = program.commands[0];
      const fastOption = cmd?.options.find((opt) => opt.long === '--fast');

      expect(fastOption).toBeDefined();
    });

    // Should have precise option
    it('should have precise option', () => {
      setupSplit(program);
      const cmd = program.commands[0];
      const preciseOption = cmd?.options.find((opt) => opt.long === '--precise');

      expect(preciseOption).toBeDefined();
    });

    // Should have codec option
    it('should have codec option', () => {
      setupSplit(program);
      const cmd = program.commands[0];
      const codecOption = cmd?.options.find((opt) => opt.long === '--codec');

      expect(codecOption).toBeDefined();
    });
  });

  // Tests for splitAction
  describe('splitAction', () => {
    // Should should exit when dependencies missing
    it('should exit when dependencies missing', async () => {
      const { checkDependencies } = await import('../../utils/dependencies.js');

      vi.mocked(checkDependencies).mockResolvedValue({ ok: false, missing: ['ffmpeg'] });

      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

      await splitAction('input.mp4', { preset: 'instagram' });

      // Expect process.exit is called with 1
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    // Should should exit when neither preset nor duration provided
    it('should exit when neither preset nor duration provided', async () => {
      const { checkDependencies } = await import('../../utils/dependencies.js');
      const { validateFileExists } = await import('../../utils/validations.js');

      vi.mocked(checkDependencies).mockResolvedValue({ ok: true, missing: [] });
      vi.mocked(validateFileExists).mockResolvedValue(undefined);

      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

      await splitAction('input.mp4', {});

      // Expect process.exit is called with 1
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    // Should should exit when both preset and duration provided
    it('should exit when both preset and duration provided', async () => {
      const { checkDependencies } = await import('../../utils/dependencies.js');
      const { validateFileExists } = await import('../../utils/validations.js');

      vi.mocked(checkDependencies).mockResolvedValue({ ok: true, missing: [] });
      vi.mocked(validateFileExists).mockResolvedValue(undefined);

      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

      await splitAction('input.mp4', { preset: 'instagram', duration: '60' });

      // Expect process.exit is called with 1
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    // Should should exit when duration is zero or negative
    it('should exit when duration is zero or negative', async () => {
      const { checkDependencies } = await import('../../utils/dependencies.js');
      const { validateFileExists } = await import('../../utils/validations.js');
      const { parseDuration } = await import('../../utils/split.js');

      vi.mocked(checkDependencies).mockResolvedValue({ ok: true, missing: [] });
      vi.mocked(validateFileExists).mockResolvedValue(undefined);
      vi.mocked(parseDuration).mockReturnValue(0);

      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

      await splitAction('input.mp4', { duration: '0' });

      // Expect process.exit is called with 1
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    // Should should return early when video is short (no split needed)
    it('should return early when video is short', async () => {
      const { checkDependencies } = await import('../../utils/dependencies.js');
      const { validateFileExists } = await import('../../utils/validations.js');
      const { getVideoDuration } = await import('../../utils/ffmpeg.js');
      const { parseDuration, calculateNumParts } = await import('../../utils/split.js');

      vi.mocked(checkDependencies).mockResolvedValue({ ok: true, missing: [] });
      vi.mocked(validateFileExists).mockResolvedValue(undefined);
      vi.mocked(getVideoDuration).mockResolvedValue(30);
      vi.mocked(parseDuration).mockReturnValue(60);
      vi.mocked(calculateNumParts).mockReturnValue(1);

      await splitAction('input.mp4', { duration: '60' });

      // Expect calculateNumParts returned 1 (no split needed)
      expect(calculateNumParts).toHaveBeenCalledWith(30, 60);
    });

    // Should should use stream copy in fast mode
    it('should use stream copy in fast mode', async () => {
      const { checkDependencies } = await import('../../utils/dependencies.js');
      const { validateFileExists } = await import('../../utils/validations.js');
      const { getVideoDuration } = await import('../../utils/ffmpeg.js');
      const { calculateNumParts, splitVideoStreamCopy } = await import('../../utils/split.js');
      const { createProgressBar } = await import('../../utils/progress.js');

      vi.mocked(checkDependencies).mockResolvedValue({ ok: true, missing: [] });
      vi.mocked(validateFileExists).mockResolvedValue(undefined);
      vi.mocked(getVideoDuration).mockResolvedValue(120);
      vi.mocked(calculateNumParts).mockReturnValue(2);
      vi.mocked(createProgressBar).mockReturnValue(mockProgressBar as never);
      vi.mocked(splitVideoStreamCopy).mockResolvedValue(['out1.mp4', 'out2.mp4']);

      await splitAction('input.mp4', { duration: '60', fast: true });

      // Expect splitVideoStreamCopy is called
      expect(splitVideoStreamCopy).toHaveBeenCalled();
    });

    // Should should use re-encode in precise mode (default)
    it('should use re-encode in precise mode (default)', async () => {
      const { checkDependencies } = await import('../../utils/dependencies.js');
      const { validateFileExists } = await import('../../utils/validations.js');
      const { getVideoDuration } = await import('../../utils/ffmpeg.js');
      const { calculateNumParts, splitVideoReencode } = await import('../../utils/split.js');
      const { createProgressBar } = await import('../../utils/progress.js');

      vi.mocked(checkDependencies).mockResolvedValue({ ok: true, missing: [] });
      vi.mocked(validateFileExists).mockResolvedValue(undefined);
      vi.mocked(getVideoDuration).mockResolvedValue(120);
      vi.mocked(calculateNumParts).mockReturnValue(2);
      vi.mocked(createProgressBar).mockReturnValue(mockProgressBar as never);
      vi.mocked(splitVideoReencode).mockResolvedValue(['out1.mp4', 'out2.mp4']);

      await splitAction('input.mp4', { duration: '60' });

      // Expect splitVideoReencode is called (default precise mode)
      expect(splitVideoReencode).toHaveBeenCalled();
    });

    // Should should use preset duration
    it('should use preset duration', async () => {
      const { checkDependencies } = await import('../../utils/dependencies.js');
      const { validateFileExists } = await import('../../utils/validations.js');
      const { getVideoDuration } = await import('../../utils/ffmpeg.js');
      const { getPresetDuration, calculateNumParts, splitVideoReencode } = await import('../../utils/split.js');
      const { createProgressBar } = await import('../../utils/progress.js');

      vi.mocked(checkDependencies).mockResolvedValue({ ok: true, missing: [] });
      vi.mocked(validateFileExists).mockResolvedValue(undefined);
      vi.mocked(getPresetDuration).mockReturnValue(60);
      vi.mocked(getVideoDuration).mockResolvedValue(120);
      vi.mocked(calculateNumParts).mockReturnValue(2);
      vi.mocked(createProgressBar).mockReturnValue(mockProgressBar as never);
      vi.mocked(splitVideoReencode).mockResolvedValue(['out1.mp4', 'out2.mp4']);

      await splitAction('input.mp4', { preset: 'instagram' });

      // Expect getPresetDuration is called with instagram
      expect(getPresetDuration).toHaveBeenCalledWith('instagram');
    });

    // Should should exit when user declines overwrite
    it('should exit when user declines overwrite', async () => {
      const { checkDependencies } = await import('../../utils/dependencies.js');
      const { validateFileExists } = await import('../../utils/validations.js');
      const { getVideoDuration } = await import('../../utils/ffmpeg.js');
      const { calculateNumParts } = await import('../../utils/split.js');
      const { checkAndPromptOverwrite } = await import('../../utils/prompt.js');

      vi.mocked(checkDependencies).mockResolvedValue({ ok: true, missing: [] });
      vi.mocked(validateFileExists).mockResolvedValue(undefined);
      vi.mocked(getVideoDuration).mockResolvedValue(120);
      vi.mocked(calculateNumParts).mockReturnValue(2);
      vi.mocked(checkAndPromptOverwrite).mockResolvedValue(false);

      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

      await splitAction('input.mp4', { duration: '60' });

      // Expect process.exit is called with 0
      expect(exitSpy).toHaveBeenCalledWith(0);
    });

    // Should should handle split errors
    it('should handle split errors', async () => {
      const { checkDependencies } = await import('../../utils/dependencies.js');
      const { validateFileExists } = await import('../../utils/validations.js');
      const { getVideoDuration } = await import('../../utils/ffmpeg.js');
      const { calculateNumParts, splitVideoReencode } = await import('../../utils/split.js');
      const { createProgressBar } = await import('../../utils/progress.js');

      vi.mocked(checkDependencies).mockResolvedValue({ ok: true, missing: [] });
      vi.mocked(validateFileExists).mockResolvedValue(undefined);
      vi.mocked(getVideoDuration).mockResolvedValue(120);
      vi.mocked(calculateNumParts).mockReturnValue(2);
      vi.mocked(createProgressBar).mockReturnValue(mockProgressBar as never);
      vi.mocked(splitVideoReencode).mockRejectedValue(new Error('split error'));

      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

      await splitAction('input.mp4', { duration: '60' });

      // Expect process.exit is called with 1
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    // Should should handle non-Error thrown values in outer catch
    it('should handle non-Error thrown values in outer catch', async () => {
      const { checkDependencies } = await import('../../utils/dependencies.js');

      vi.mocked(checkDependencies).mockRejectedValue('unknown error');

      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

      await splitAction('input.mp4', { preset: 'instagram' });

      // Expect process.exit is called with 1
      expect(exitSpy).toHaveBeenCalledWith(1);
    });
  });
});
