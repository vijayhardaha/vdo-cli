import { Command } from 'commander';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { setupAudio, audioAction } from '@/commands/audio';

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

vi.mock('../../utils/ffmpeg', () => ({ extractAudio: vi.fn() }));

vi.mock('../../utils/validations', () => ({
  validateFileExists: vi.fn(),
  validateFormat: vi.fn(),
  validateBitrate: vi.fn(),
}));

vi.mock('fs/promises', () => ({ access: vi.fn().mockRejectedValue(new Error('File not found')) }));

vi.mock('../../utils/prompt', () => ({
  checkAndPromptOverwrite: vi.fn().mockResolvedValue(true),
  promptOverwrite: vi.fn().mockResolvedValue(true),
}));

// Tests for audio command
describe('audio command', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Tests for setupAudio
  describe('setupAudio', () => {
    let program: Command;

    beforeEach(() => {
      program = new Command();
    });

    // Should register audio command with correct options
    it('should register audio command with correct options', () => {
      setupAudio(program);
      const commands = program.commands;

      expect(commands).toHaveLength(1);
      expect(commands[0]?.name()).toBe('audio');
      expect(commands[0]?.aliases()).toContain('au');
    });

    // Should have format option
    it('should have format option', () => {
      setupAudio(program);
      const cmd = program.commands[0];
      const formatOption = cmd?.options.find((opt) => opt.long === '--format');

      expect(formatOption).toBeDefined();
    });

    // Should have bitrate option
    it('should have bitrate option', () => {
      setupAudio(program);
      const cmd = program.commands[0];
      const bitrateOption = cmd?.options.find((opt) => opt.long === '--bitrate');

      expect(bitrateOption).toBeDefined();
    });
  });

  // Tests for audioAction
  describe('audioAction', () => {
    // Should should exit when dependencies missing
    it('should exit when dependencies missing', async () => {
      const { checkDependencies } = await import('../../utils/dependencies');

      vi.mocked(checkDependencies).mockResolvedValue({ ok: false, missing: ['ffmpeg'] });

      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

      await audioAction('input.mp4', {});

      // Expect process.exit is called with 1
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    // Should should extract audio with defaults
    it('should extract audio with defaults', async () => {
      const { checkDependencies } = await import('../../utils/dependencies');
      const { validateFileExists, validateFormat, validateBitrate } = await import('../../utils/validations');
      const { extractAudio } = await import('../../utils/ffmpeg');

      vi.mocked(checkDependencies).mockResolvedValue({ ok: true, missing: [] });
      vi.mocked(validateFileExists).mockResolvedValue(undefined);
      vi.mocked(validateFormat).mockReturnValue(undefined);
      vi.mocked(validateBitrate).mockReturnValue(undefined);
      vi.mocked(extractAudio).mockResolvedValue(undefined);

      await audioAction('input.mp4', {});

      // Expect extractAudio is called
      expect(extractAudio).toHaveBeenCalled();
    });

    // Should should use provided output, format and bitrate
    it('should use provided output, format and bitrate', async () => {
      const { checkDependencies } = await import('../../utils/dependencies');
      const { validateFileExists, validateFormat, validateBitrate } = await import('../../utils/validations');
      const { extractAudio } = await import('../../utils/ffmpeg');

      vi.mocked(checkDependencies).mockResolvedValue({ ok: true, missing: [] });
      vi.mocked(validateFileExists).mockResolvedValue(undefined);
      vi.mocked(validateFormat).mockReturnValue(undefined);
      vi.mocked(validateBitrate).mockReturnValue(undefined);
      vi.mocked(extractAudio).mockResolvedValue(undefined);

      await audioAction('input.mp4', { output: 'track.wav', format: 'wav', bitrate: '320k' });

      // Expect extractAudio is called with custom options
      const callArgs = vi.mocked(extractAudio).mock.calls[0];
      expect(callArgs?.[1]).toBe('track.wav');
      expect(callArgs?.[2]).toBe('wav');
      expect(callArgs?.[3]).toBe('320k');
    });

    // Should should handle errors and exit 1
    it('should handle errors and exit 1', async () => {
      const { checkDependencies } = await import('../../utils/dependencies');
      const { validateFileExists } = await import('../../utils/validations');

      vi.mocked(checkDependencies).mockResolvedValue({ ok: true, missing: [] });
      vi.mocked(validateFileExists).mockRejectedValue(new Error('File not found'));

      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

      await audioAction('input.mp4', {});

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

      await audioAction('input.mp4', {});

      // Expect process.exit is called with 1
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    // Should should exit when validateBitrate throws error
    it('should exit when validateBitrate throws error', async () => {
      const { checkDependencies } = await import('../../utils/dependencies');
      const { validateFileExists, validateBitrate } = await import('../../utils/validations');

      vi.mocked(checkDependencies).mockResolvedValue({ ok: true, missing: [] });
      vi.mocked(validateFileExists).mockResolvedValue(undefined);
      vi.mocked(validateBitrate).mockImplementation(() => {
        throw new Error('Invalid bitrate');
      });

      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

      await audioAction('input.mp4', {});

      // Expect process.exit is called with 1
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    // Should should handle extractAudio errors and exit 1
    it('should handle extractAudio errors and exit 1', async () => {
      const { checkDependencies } = await import('../../utils/dependencies');
      const { validateFileExists, validateFormat, validateBitrate } = await import('../../utils/validations');
      const { extractAudio } = await import('../../utils/ffmpeg');

      vi.mocked(checkDependencies).mockResolvedValue({ ok: true, missing: [] });
      vi.mocked(validateFileExists).mockResolvedValue(undefined);
      vi.mocked(validateFormat).mockReturnValue(undefined);
      vi.mocked(validateBitrate).mockReturnValue(undefined);
      vi.mocked(extractAudio).mockRejectedValue(new Error('Audio extraction failed'));

      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

      await audioAction('input.mp4', {});

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
        throw new Error('Invalid format');
      });

      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

      await audioAction('input.mp4', {});

      // Expect process.exit is called with 1
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    // Should should handle non-Error thrown values in outer catch
    it('should handle non-Error thrown values in outer catch', async () => {
      const { checkDependencies } = await import('../../utils/dependencies');

      vi.mocked(checkDependencies).mockRejectedValue('unknown error');

      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

      await audioAction('input.mp4', {});

      // Expect process.exit is called with 1
      expect(exitSpy).toHaveBeenCalledWith(1);
    });
  });
});
