import { Command } from 'commander';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { setupConvert, convertAction } from '@/commands/convert';
import { ensureDependencies } from '@/utils/dependencies';
import { convertVideo } from '@/utils/ffmpeg';
import { log, handleError } from '@/utils/log';
import { validateFileExists, validateFormat, validatePreset } from '@/utils/validations';

vi.mock('../../utils/dependencies', () => {
  const mockCheckDependencies = vi.fn().mockResolvedValue({ ok: true, missing: [] });
  const mockEnsureDependencies = vi.fn().mockResolvedValue(true);
  return { checkDependencies: mockCheckDependencies, ensureDependencies: mockEnsureDependencies, runCommand: vi.fn() };
});

vi.mock('../../utils/output', () => ({
  resolveOutputFile: vi.fn((o) => {
    if (o.output) {
      if (o.format && !o.output.endsWith(`.${o.format}`)) {
        return `${o.output}.${o.format}`;
      }
      return o.output;
    }
    const base = o.input.replace(/\.[^.]+$/, '');
    return `${base}_converted.${o.format || 'mp4'}`;
  }),
}));

vi.mock('../../utils/ffmpeg', () => ({ convertVideo: vi.fn(), getVideoDuration: vi.fn(() => Promise.resolve(60)) }));

vi.mock('../../utils/validations', () => ({
  validateFileExists: vi.fn().mockResolvedValue(undefined),
  validateFormat: vi.fn(),
  validatePreset: vi.fn(),
}));

vi.mock('../../utils/progress', () => ({
  createProgressBar: vi.fn(() => ({ start: vi.fn(), stop: vi.fn(), update: vi.fn(), render: vi.fn() })),
  createProgressCallback: vi.fn().mockReturnValue(vi.fn()),
  formatFileSize: vi.fn(() => ({ value: 100, unit: 'MB' })),
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

// Tests for convert command
describe('convert command', () => {
  let exitSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    vi.mocked(ensureDependencies).mockResolvedValue(true);
    vi.mocked(validateFileExists).mockResolvedValue(undefined);
    vi.mocked(validateFormat).mockReturnValue(undefined);
    vi.mocked(validatePreset).mockReturnValue(undefined);
    vi.mocked(convertVideo).mockResolvedValue(undefined);
  });

  afterEach(() => {
    exitSpy.mockRestore();
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
    // Should convert with default format and preset
    it('should convert with default format and preset', async () => {
      await convertAction('input.mp4', {});

      // Expect file existence is validated
      expect(validateFileExists).toHaveBeenCalledWith('input.mp4');

      // Expect format defaults to mp4 and preset to fast
      expect(validateFormat).toHaveBeenCalledWith('mp4', ['mp4', 'mkv', 'avi', 'mov', 'flv']);
      expect(validatePreset).toHaveBeenCalledWith('fast', ['ultrafast', 'fast', 'medium', 'slow', 'high-quality']);

      // Expect convertVideo is called with default format and preset
      expect(convertVideo).toHaveBeenCalledWith(
        'input.mp4',
        'input_converted.mp4',
        'mp4',
        'fast',
        expect.any(Function)
      );

      // Expect success is logged
      expect(log.succeed).toHaveBeenCalledWith('Conversion completed successfully!');
      expect(log.info).toHaveBeenCalledWith(expect.stringContaining('Output:'));
    });

    // Should use provided format and preset
    it('should use provided format and preset', async () => {
      await convertAction('input.mp4', { format: 'mkv', preset: 'slow' });

      // Expect validateFormat and validatePreset receive custom values
      expect(validateFormat).toHaveBeenCalledWith('mkv', ['mp4', 'mkv', 'avi', 'mov', 'flv']);
      expect(validatePreset).toHaveBeenCalledWith('slow', ['ultrafast', 'fast', 'medium', 'slow', 'high-quality']);

      // Expect convertVideo is called with custom format and preset
      expect(convertVideo).toHaveBeenCalledWith(
        'input.mp4',
        'input_converted.mkv',
        'mkv',
        'slow',
        expect.any(Function)
      );
    });

    // Should use provided output file
    it('should use provided output file when specified', async () => {
      await convertAction('input.mp4', { output: 'output.avi', format: 'avi' });

      // Expect convertVideo is called with the custom output path
      expect(convertVideo).toHaveBeenCalledWith('input.mp4', 'output.avi', 'avi', 'fast', expect.any(Function));
    });

    // Should call handleError when validateFileExists fails
    it('should call handleError when validateFileExists fails', async () => {
      vi.mocked(validateFileExists).mockRejectedValue(new Error('File not found'));

      await convertAction('input.mp4', {});

      // Expect handleError is called with the validation error
      expect(handleError).toHaveBeenCalledWith(expect.any(Error));
    });

    // Should call handleError when validateFormat fails
    it('should call handleError when validateFormat fails', async () => {
      vi.mocked(validateFormat).mockImplementation(() => {
        throw new Error('Invalid format');
      });

      await convertAction('input.mp4', {});

      // Expect handleError is called with the format error
      expect(handleError).toHaveBeenCalledWith(expect.any(Error));
    });

    // Should call handleError when validatePreset fails
    it('should call handleError when validatePreset fails', async () => {
      vi.mocked(validatePreset).mockImplementation(() => {
        throw new Error('Invalid preset');
      });

      await convertAction('input.mp4', {});

      // Expect handleError is called with the preset error
      expect(handleError).toHaveBeenCalledWith(expect.any(Error));
    });

    // Should call handleError when convertVideo fails
    it('should call handleError when convertVideo fails', async () => {
      vi.mocked(convertVideo).mockRejectedValue(new Error('Conversion failed'));

      await convertAction('input.mp4', {});

      // Expect handleError is called with the conversion error and prefix
      expect(handleError).toHaveBeenCalledWith(expect.any(Error), 'Conversion failed: ');
    });

    // Should call handleError when ensureDependencies fails
    it('should call handleError when ensureDependencies fails', async () => {
      vi.mocked(ensureDependencies).mockRejectedValue(new Error('Missing dependencies'));

      await convertAction('input.mp4', {});

      // Expect handleError is called with the dependency error
      expect(handleError).toHaveBeenCalledWith(expect.any(Error));
    });

    // Should invoke progress callback during conversion
    it('should invoke progress callback during conversion', async () => {
      const calls: number[] = [];
      vi.mocked(convertVideo).mockImplementation(async (_input, _output, _format, _preset, cb) => {
        cb?.(50, 50, 60);
        calls.push(50);
      });

      await convertAction('input.mp4', {});

      // Expect the progress callback was invoked by the convert function
      expect(calls).toContain(50);
      expect(convertVideo).toHaveBeenCalledWith(
        'input.mp4',
        'input_converted.mp4',
        'mp4',
        'fast',
        expect.any(Function)
      );
    });
  });
});
