import { Command } from 'commander';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { setupConvert, convertAction } from '@/commands/convert';

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

vi.mock('../../utils/ffmpeg', () => ({ convertVideo: vi.fn(), getVideoDuration: vi.fn(() => Promise.resolve(60)) }));

vi.mock('../../utils/validations', () => ({
  validateFileExists: vi.fn(),
  validateFormat: vi.fn(),
  validatePreset: vi.fn(),
}));

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

// Tests for convert command
describe('convert command', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Tests for setupConvert
  describe('setupConvert', () => {
    let program: Command;

    beforeEach(() => {
      program = new Command();
    });

    // Should register convert command with correct options
    it('should register convert command with correct options', () => {
      setupConvert(program);
      const commands = program.commands;

      expect(commands).toHaveLength(1);
      expect(commands[0]?.name()).toBe('convert');
      expect(commands[0]?.aliases()).toContain('cvt');
    });

    // Should have to option
    it('should have to option', () => {
      setupConvert(program);
      const cmd = program.commands[0];
      expect(cmd?.options).toHaveLength(3);
    });

    // Should have preset option
    it('should have preset option', () => {
      setupConvert(program);
      const cmd = program.commands[0];
      const presetOption = cmd?.options.find((opt) => opt.long === '--preset');

      expect(presetOption).toBeDefined();
    });
  });

  // Tests for convertAction
  describe('convertAction', () => {
    // Should should exit when dependencies missing
    it('should exit when dependencies missing', async () => {
      const { checkDependencies } = await import('../../utils/dependencies');
      vi.mocked(checkDependencies).mockResolvedValue({ ok: false, missing: ['ffmpeg'] });
      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

      await convertAction('input.avi', {});

      // Expect process.exit is called with 1
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    // Should should convert video with default options
    it('should convert video with default options', async () => {
      const { checkDependencies } = await import('../../utils/dependencies');
      const { validateFileExists, validateFormat, validatePreset } = await import('../../utils/validations');
      const { convertVideo } = await import('../../utils/ffmpeg');
      const { createProgressBar } = await import('../../utils/progress');

      vi.mocked(checkDependencies).mockResolvedValue({ ok: true, missing: [] });
      vi.mocked(validateFileExists).mockResolvedValue(undefined);
      vi.mocked(validateFormat).mockReturnValue(undefined);
      vi.mocked(validatePreset).mockReturnValue(undefined);
      vi.mocked(convertVideo).mockResolvedValue(undefined);
      vi.mocked(createProgressBar).mockReturnValue(mockProgressBar as never);

      await convertAction('input.avi', {});

      // Expect convertVideo is called
      expect(convertVideo).toHaveBeenCalled();
    });

    // Should should use provided output option
    it('should use provided output option', async () => {
      const { checkDependencies } = await import('../../utils/dependencies');
      const { validateFileExists, validateFormat, validatePreset } = await import('../../utils/validations');
      const { convertVideo } = await import('../../utils/ffmpeg');
      const { createProgressBar } = await import('../../utils/progress');

      vi.mocked(checkDependencies).mockResolvedValue({ ok: true, missing: [] });
      vi.mocked(validateFileExists).mockResolvedValue(undefined);
      vi.mocked(validateFormat).mockReturnValue(undefined);
      vi.mocked(validatePreset).mockReturnValue(undefined);
      vi.mocked(convertVideo).mockResolvedValue(undefined);
      vi.mocked(createProgressBar).mockReturnValue(mockProgressBar as never);

      await convertAction('input.avi', { output: 'custom_out.mp4', format: 'mp4', preset: 'slow' });

      const callArgs = vi.mocked(convertVideo).mock.calls[0];

      // Expect convertVideo is called with custom output
      expect(callArgs?.[1]).toBe('custom_out.mp4');
    });

    // Should should invoke progressCallback
    it('should invoke progressCallback', async () => {
      const { checkDependencies } = await import('../../utils/dependencies');
      const { validateFileExists, validateFormat, validatePreset } = await import('../../utils/validations');
      const { convertVideo } = await import('../../utils/ffmpeg');
      const { createProgressBar } = await import('../../utils/progress');

      vi.mocked(checkDependencies).mockResolvedValue({ ok: true, missing: [] });
      vi.mocked(validateFileExists).mockResolvedValue(undefined);
      vi.mocked(validateFormat).mockReturnValue(undefined);
      vi.mocked(validatePreset).mockReturnValue(undefined);
      vi.mocked(createProgressBar).mockReturnValue(mockProgressBar as never);
      vi.mocked(convertVideo).mockImplementation(async (_i, _o, _f, _p, onProgress) => {
        if (onProgress) onProgress(50, 30, 60);
      });

      await convertAction('input.avi', {});

      // Expect progress bar is updated
      expect(mockProgressBar.update).toHaveBeenCalledWith(50);
    });

    // Should should not update progress bar when percentage is 0
    it('should not update progress bar when percentage is 0', async () => {
      const { checkDependencies } = await import('../../utils/dependencies');
      const { validateFileExists, validateFormat, validatePreset } = await import('../../utils/validations');
      const { convertVideo } = await import('../../utils/ffmpeg');
      const { createProgressBar } = await import('../../utils/progress');

      vi.mocked(checkDependencies).mockResolvedValue({ ok: true, missing: [] });
      vi.mocked(validateFileExists).mockResolvedValue(undefined);
      vi.mocked(validateFormat).mockReturnValue(undefined);
      vi.mocked(validatePreset).mockReturnValue(undefined);
      vi.mocked(createProgressBar).mockReturnValue(mockProgressBar as never);
      vi.mocked(convertVideo).mockImplementation(async (_i, _o, _f, _p, onProgress) => {
        if (onProgress) onProgress(0, 0, 60);
      });

      await convertAction('input.avi', {});

      // Expect progress bar update is not called
      expect(mockProgressBar.update).not.toHaveBeenCalled();
    });

    // Should should handle errors and exit 1
    it('should handle errors and exit 1', async () => {
      const { checkDependencies } = await import('../../utils/dependencies');
      const { validateFileExists } = await import('../../utils/validations');
      vi.mocked(checkDependencies).mockResolvedValue({ ok: true, missing: [] });
      vi.mocked(validateFileExists).mockRejectedValue(new Error('File not found: input.avi'));
      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

      await convertAction('input.avi', {});

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

      await convertAction('input.avi', {});

      // Expect process.exit is called with 1
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    // Should should exit when validateFormat throws error
    it('should exit when validateFormat throws error', async () => {
      const { checkDependencies } = await import('../../utils/dependencies');
      const { validateFileExists, validateFormat } = await import('../../utils/validations');
      vi.mocked(checkDependencies).mockResolvedValue({ ok: true, missing: [] });
      vi.mocked(validateFileExists).mockResolvedValue(undefined);
      vi.mocked(validateFormat).mockImplementation(() => {
        throw new Error('Invalid format: xyz');
      });
      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

      await convertAction('input.avi', {});

      // Expect process.exit is called with 1
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    // Should should exit when validatePreset throws error
    it('should exit when validatePreset throws error', async () => {
      const { checkDependencies } = await import('../../utils/dependencies');
      const { validateFileExists, validateFormat, validatePreset } = await import('../../utils/validations');
      vi.mocked(checkDependencies).mockResolvedValue({ ok: true, missing: [] });
      vi.mocked(validateFileExists).mockResolvedValue(undefined);
      vi.mocked(validateFormat).mockReturnValue(undefined);
      vi.mocked(validatePreset).mockImplementation(() => {
        throw new Error('Invalid preset: invalid');
      });

      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

      await convertAction('input.avi', {});

      // Expect process.exit is called with 1
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    // Should should handle convertVideo errors and exit 1
    it('should handle convertVideo errors and exit 1', async () => {
      const { checkDependencies } = await import('../../utils/dependencies');
      const { validateFileExists, validateFormat, validatePreset } = await import('../../utils/validations');
      const { convertVideo } = await import('../../utils/ffmpeg');
      const { createProgressBar } = await import('../../utils/progress');

      vi.mocked(checkDependencies).mockResolvedValue({ ok: true, missing: [] });
      vi.mocked(validateFileExists).mockResolvedValue(undefined);
      vi.mocked(validateFormat).mockReturnValue(undefined);
      vi.mocked(validatePreset).mockReturnValue(undefined);
      vi.mocked(convertVideo).mockRejectedValue(new Error('Conversion failed'));
      vi.mocked(createProgressBar).mockReturnValue(mockProgressBar as never);

      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

      await convertAction('input.avi', {});

      // Expect progress bar is stopped and process exits with 1
      expect(mockProgressBar.stop).toHaveBeenCalled();
      expect(exitSpy).toHaveBeenCalledWith(1);
    });
  });
});
