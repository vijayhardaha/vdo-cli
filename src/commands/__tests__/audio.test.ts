import { Command } from 'commander';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { setupAudio, audioAction } from '@/commands/audio';
import { ensureDependencies } from '@/utils/dependencies';
import { extractAudio } from '@/utils/ffmpeg';
import { log, handleError } from '@/utils/log';
import { validateFileExists, validateFormat, validateBitrate } from '@/utils/validations';

vi.mock('../../utils/dependencies', () => {
  const mockCheckDependencies = vi.fn().mockResolvedValue({ ok: true, missing: [] });
  const mockEnsureDependencies = vi.fn().mockResolvedValue(true);
  return { checkDependencies: mockCheckDependencies, ensureDependencies: mockEnsureDependencies, runCommand: vi.fn() };
});

vi.mock('../../utils/ffmpeg', () => ({ extractAudio: vi.fn() }));

vi.mock('../../utils/validations', () => ({
  validateFileExists: vi.fn().mockResolvedValue(undefined),
  validateFormat: vi.fn(),
  validateBitrate: vi.fn(),
}));

vi.mock('../../utils/progress', () => ({
  createProgressBar: vi.fn(() => ({ start: vi.fn(), stop: vi.fn(), update: vi.fn(), render: vi.fn() })),
}));

vi.mock('../../utils/log', () => ({
  log: { succeed: vi.fn(), fail: vi.fn(), info: vi.fn(), loading: vi.fn(), warn: vi.fn() },
  handleError: vi.fn(),
}));

vi.mock('fs/promises', () => ({ access: vi.fn().mockRejectedValue(new Error('File not found')) }));

vi.mock('../../utils/prompt', () => ({
  checkAndPromptOverwrite: vi.fn().mockResolvedValue(true),
  promptOverwrite: vi.fn().mockResolvedValue(true),
}));

// Tests for audio command
describe('audio command', () => {
  let exitSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    vi.mocked(ensureDependencies).mockResolvedValue(true);
    vi.mocked(validateFileExists).mockResolvedValue(undefined);
    vi.mocked(validateFormat).mockReturnValue(undefined);
    vi.mocked(validateBitrate).mockReturnValue(undefined);
    vi.mocked(extractAudio).mockResolvedValue(undefined);
  });

  afterEach(() => {
    exitSpy.mockRestore();
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
    // Should extract audio with default format and bitrate
    it('should extract audio with default format and bitrate', async () => {
      await audioAction('input.mp4', {});

      // Expect file existence is validated
      expect(validateFileExists).toHaveBeenCalledWith('input.mp4');

      // Expect format defaults to mp3 and bitrate to 192k
      expect(validateFormat).toHaveBeenCalledWith('mp3', ['mp3', 'wav', 'aac']);
      expect(validateBitrate).toHaveBeenCalledWith('192k');

      // Expect extractAudio is called with correct arguments and default output path
      expect(extractAudio).toHaveBeenCalledWith('input.mp4', 'input.mp3', 'mp3', '192k', expect.any(Function));

      // Expect success is logged
      expect(log.succeed).toHaveBeenCalledWith('Audio extraction completed!');
      expect(log.info).toHaveBeenCalledWith(expect.stringContaining('Output:'));
    });

    // Should use provided format and bitrate
    it('should use provided format and bitrate', async () => {
      await audioAction('input.mp4', { format: 'wav', bitrate: '320k' });

      // Expect validateFormat and validateBitrate receive custom values
      expect(validateFormat).toHaveBeenCalledWith('wav', ['mp3', 'wav', 'aac']);
      expect(validateBitrate).toHaveBeenCalledWith('320k');

      // Expect extractAudio is called with custom format and bitrate
      expect(extractAudio).toHaveBeenCalledWith('input.mp4', 'input.wav', 'wav', '320k', expect.any(Function));
    });

    // Should use provided output file
    it('should use provided output file when specified', async () => {
      await audioAction('input.mp4', { output: '/custom/path/audio.mp3' });

      // Expect extractAudio is called with the custom output path
      expect(extractAudio).toHaveBeenCalledWith(
        'input.mp4',
        '/custom/path/audio.mp3',
        'mp3',
        '192k',
        expect.any(Function)
      );
    });

    // Should call handleError when validateFileExists fails
    it('should call handleError when validateFileExists fails', async () => {
      vi.mocked(validateFileExists).mockRejectedValue(new Error('File not found'));

      await audioAction('input.mp4', {});

      // Expect handleError is called with the validation error
      expect(handleError).toHaveBeenCalledWith(expect.any(Error));
    });

    // Should call handleError when validateFormat fails
    it('should call handleError when validateFormat fails', async () => {
      vi.mocked(validateFormat).mockImplementation(() => {
        throw new Error('Invalid format');
      });

      await audioAction('input.mp4', {});

      // Expect handleError is called with the format error
      expect(handleError).toHaveBeenCalledWith(expect.any(Error));
    });

    // Should call handleError when validateBitrate fails
    it('should call handleError when validateBitrate fails', async () => {
      vi.mocked(validateBitrate).mockImplementation(() => {
        throw new Error('Invalid bitrate');
      });

      await audioAction('input.mp4', {});

      // Expect handleError is called with the bitrate error
      expect(handleError).toHaveBeenCalledWith(expect.any(Error));
    });

    // Should call handleError when extractAudio fails
    it('should call handleError when extractAudio fails', async () => {
      vi.mocked(extractAudio).mockRejectedValue(new Error('Extraction failed'));

      await audioAction('input.mp4', {});

      // Expect handleError is called with the extraction error and prefix
      expect(handleError).toHaveBeenCalledWith(expect.any(Error), 'Audio extraction failed: ');
    });

    // Should call handleError when ensureDependencies fails
    it('should call handleError when ensureDependencies fails', async () => {
      vi.mocked(ensureDependencies).mockRejectedValue(new Error('Missing dependencies'));

      await audioAction('input.mp4', {});

      // Expect handleError is called with the dependency error
      expect(handleError).toHaveBeenCalledWith(expect.any(Error));
    });

    // Should call progress callback with progress > 0
    it('should call progress callback with progress > 0', async () => {
      vi.mocked(extractAudio).mockImplementation(async (_input, _output, _format, _bitrate, onProgress) => {
        onProgress?.(50);
      });

      await audioAction('input.mp4', {});

      // Expect extractAudio is called (which invokes the progress callback)
      expect(extractAudio).toHaveBeenCalled();
    });
  });
});
