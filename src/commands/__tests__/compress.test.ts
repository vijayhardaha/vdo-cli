import { Command } from 'commander';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { setupCompress, compressAction } from '../compress.js';

vi.mock('../../utils/dependencies.js', () => ({ checkDependencies: vi.fn(), runCommand: vi.fn() }));

vi.mock('../../utils/ffmpeg.js', () => ({
  compressVideo: vi.fn(),
  getVideoDuration: vi.fn(() => Promise.resolve(60)),
}));

vi.mock('../../utils/validations.js', () => ({
  validateFileExists: vi.fn(),
  validatePreset: vi.fn(),
  validateCRF: vi.fn(),
}));

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

// Tests for compress command
describe('compress command', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Tests for setupCompress
  describe('setupCompress', () => {
    let program: Command;

    beforeEach(() => {
      program = new Command();
    });

    // Should register compress command with correct options
    it('should register compress command with correct options', () => {
      setupCompress(program);
      const commands = program.commands;

      expect(commands).toHaveLength(1);
      expect(commands[0]?.name()).toBe('compress');
      expect(commands[0]?.aliases()).toContain('cps');
    });

    // Should have crf option
    it('should have crf option', () => {
      setupCompress(program);
      const cmd = program.commands[0];
      const crfOption = cmd?.options.find((opt) => opt.long === '--crf');

      expect(crfOption).toBeDefined();
    });

    // Should have preset option
    it('should have preset option', () => {
      setupCompress(program);
      const cmd = program.commands[0];
      const presetOption = cmd?.options.find((opt) => opt.long === '--preset');

      expect(presetOption).toBeDefined();
    });
  });

  // Tests for compressAction
  describe('compressAction', () => {
    // Should should exit when dependencies missing
    it('should exit when dependencies missing', async () => {
      const { checkDependencies } = await import('../../utils/dependencies.js');

      vi.mocked(checkDependencies).mockResolvedValue({ ok: false, missing: ['ffmpeg'] });

      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

      await compressAction('input.mp4', {});

      // Expect process.exit is called with 1
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    // Should should compress video with default options
    it('should compress video with default options', async () => {
      const { checkDependencies } = await import('../../utils/dependencies.js');
      const { validateFileExists, validatePreset, validateCRF } = await import('../../utils/validations.js');
      const { compressVideo } = await import('../../utils/ffmpeg.js');
      const { createProgressBar } = await import('../../utils/progress.js');

      vi.mocked(checkDependencies).mockResolvedValue({ ok: true, missing: [] });
      vi.mocked(validateFileExists).mockResolvedValue(undefined);
      vi.mocked(validatePreset).mockReturnValue(undefined);
      vi.mocked(validateCRF).mockReturnValue(undefined);
      vi.mocked(compressVideo).mockResolvedValue(undefined);
      vi.mocked(createProgressBar).mockReturnValue(mockProgressBar as never);

      await compressAction('input.mp4', {});

      // Expect compressVideo is called
      expect(compressVideo).toHaveBeenCalled();
    });

    // Should should use provided output option
    it('should use provided output option', async () => {
      const { checkDependencies } = await import('../../utils/dependencies.js');
      const { validateFileExists, validatePreset, validateCRF } = await import('../../utils/validations.js');
      const { compressVideo } = await import('../../utils/ffmpeg.js');
      const { createProgressBar } = await import('../../utils/progress.js');

      vi.mocked(checkDependencies).mockResolvedValue({ ok: true, missing: [] });
      vi.mocked(validateFileExists).mockResolvedValue(undefined);
      vi.mocked(validatePreset).mockReturnValue(undefined);
      vi.mocked(validateCRF).mockReturnValue(undefined);
      vi.mocked(compressVideo).mockResolvedValue(undefined);
      vi.mocked(createProgressBar).mockReturnValue(mockProgressBar as never);

      await compressAction('input.mp4', { output: 'small.mp4', crf: 23, preset: 'slow' });

      const callArgs = vi.mocked(compressVideo).mock.calls[0];

      // Expect compressVideo is called with custom output and crf
      expect(callArgs?.[1]).toBe('small.mp4');
      expect(callArgs?.[2]).toBe(23);
    });

    // Should should invoke progressCallback
    it('should invoke progressCallback', async () => {
      const { checkDependencies } = await import('../../utils/dependencies.js');
      const { validateFileExists, validatePreset, validateCRF } = await import('../../utils/validations.js');
      const { compressVideo } = await import('../../utils/ffmpeg.js');
      const { createProgressBar } = await import('../../utils/progress.js');

      vi.mocked(checkDependencies).mockResolvedValue({ ok: true, missing: [] });
      vi.mocked(validateFileExists).mockResolvedValue(undefined);
      vi.mocked(validatePreset).mockReturnValue(undefined);
      vi.mocked(validateCRF).mockReturnValue(undefined);
      vi.mocked(createProgressBar).mockReturnValue(mockProgressBar as never);
      vi.mocked(compressVideo).mockImplementation(async (_i, _o, _c, _p, onProgress) => {
        if (onProgress) onProgress(75, 45, 60);
      });

      await compressAction('input.mp4', {});

      // Expect progress bar is updated
      expect(mockProgressBar.update).toHaveBeenCalledWith(75);
    });

    // Should should not update progress bar when percentage is 0
    it('should not update progress bar when percentage is 0', async () => {
      const { checkDependencies } = await import('../../utils/dependencies.js');
      const { validateFileExists, validatePreset, validateCRF } = await import('../../utils/validations.js');
      const { compressVideo } = await import('../../utils/ffmpeg.js');
      const { createProgressBar } = await import('../../utils/progress.js');

      vi.mocked(checkDependencies).mockResolvedValue({ ok: true, missing: [] });
      vi.mocked(validateFileExists).mockResolvedValue(undefined);
      vi.mocked(validatePreset).mockReturnValue(undefined);
      vi.mocked(validateCRF).mockReturnValue(undefined);
      vi.mocked(createProgressBar).mockReturnValue(mockProgressBar as never);
      vi.mocked(compressVideo).mockImplementation(async (_i, _o, _c, _p, onProgress) => {
        if (onProgress) onProgress(0, 0, 60);
      });

      await compressAction('input.mp4', {});

      // Expect progress bar update is not called
      expect(mockProgressBar.update).not.toHaveBeenCalled();
    });

    // Should should handle errors and exit 1
    it('should handle errors and exit 1', async () => {
      const { checkDependencies } = await import('../../utils/dependencies.js');
      const { validateFileExists } = await import('../../utils/validations.js');

      vi.mocked(checkDependencies).mockResolvedValue({ ok: true, missing: [] });
      vi.mocked(validateFileExists).mockRejectedValue(new Error('File not found'));

      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

      await compressAction('input.mp4', {});

      // Expect process.exit is called with 1
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    // Should should handle non-Error thrown values
    it('should handle non-Error thrown values', async () => {
      const { checkDependencies } = await import('../../utils/dependencies.js');
      const { validateFileExists } = await import('../../utils/validations.js');

      vi.mocked(checkDependencies).mockResolvedValue({ ok: true, missing: [] });
      vi.mocked(validateFileExists).mockRejectedValue('string error');

      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

      await compressAction('input.mp4', {});

      // Expect process.exit is called with 1
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    // Should should exit when validatePreset throws error
    it('should exit when validatePreset throws error', async () => {
      const { checkDependencies } = await import('../../utils/dependencies.js');
      const { validateFileExists, validatePreset } = await import('../../utils/validations.js');

      vi.mocked(checkDependencies).mockResolvedValue({ ok: true, missing: [] });
      vi.mocked(validateFileExists).mockResolvedValue(undefined);
      vi.mocked(validatePreset).mockImplementation(() => {
        throw new Error('Invalid preset');
      });

      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

      await compressAction('input.mp4', {});

      // Expect process.exit is called with 1
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    // Should should handle compressVideo errors and exit 1
    it('should handle compressVideo errors and exit 1', async () => {
      const { checkDependencies } = await import('../../utils/dependencies.js');
      const { validateFileExists, validatePreset, validateCRF } = await import('../../utils/validations.js');
      const { compressVideo } = await import('../../utils/ffmpeg.js');
      const { createProgressBar } = await import('../../utils/progress.js');

      vi.mocked(checkDependencies).mockResolvedValue({ ok: true, missing: [] });
      vi.mocked(validateFileExists).mockResolvedValue(undefined);
      vi.mocked(validatePreset).mockReturnValue(undefined);
      vi.mocked(validateCRF).mockReturnValue(undefined);
      vi.mocked(compressVideo).mockRejectedValue(new Error('Compression failed'));
      vi.mocked(createProgressBar).mockReturnValue(mockProgressBar as never);

      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

      await compressAction('input.mp4', {});

      // Expect progress bar is stopped and process exits with 1
      expect(mockProgressBar.stop).toHaveBeenCalled();
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    // Should should exit when validateCRF throws error
    it('should exit when validateCRF throws error', async () => {
      const { checkDependencies } = await import('../../utils/dependencies.js');
      const { validateFileExists, validateCRF } = await import('../../utils/validations.js');

      vi.mocked(checkDependencies).mockResolvedValue({ ok: true, missing: [] });
      vi.mocked(validateFileExists).mockResolvedValue(undefined);
      vi.mocked(validateCRF).mockImplementation(() => {
        throw new Error('Invalid CRF');
      });

      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

      await compressAction('input.mp4', {});

      // Expect process.exit is called with 1
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    // Should should handle non-Error thrown values in outer catch
    it('should handle non-Error thrown values in outer catch', async () => {
      const { checkDependencies } = await import('../../utils/dependencies.js');

      vi.mocked(checkDependencies).mockRejectedValue('unknown error');

      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

      await compressAction('input.mp4', {});

      // Expect process.exit is called with 1
      expect(exitSpy).toHaveBeenCalledWith(1);
    });
  });
});
