import { Command } from 'commander';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { setupCompress, compressAction } from '@/commands/compress';
import { ensureDependencies } from '@/utils/dependencies';
import { compressVideo } from '@/utils/ffmpeg';
import { log, handleError } from '@/utils/log';
import { validateFileExists, validateCRF, validatePreset } from '@/utils/validations';

vi.mock('../../utils/dependencies', () => {
  const mockCheckDependencies = vi.fn().mockResolvedValue({ ok: true, missing: [] });
  const mockEnsureDependencies = vi.fn().mockResolvedValue(true);
  return { checkDependencies: mockCheckDependencies, ensureDependencies: mockEnsureDependencies, runCommand: vi.fn() };
});

vi.mock('../../utils/output', () => ({
  resolveOutputFile: vi.fn((o) => {
    const ext = o.input.split('.').pop() || 'mp4';
    if (o.output) return o.output;
    const base = o.input.replace(/\.[^.]+$/, '');
    return `${base}_compressed.${ext}`;
  }),
}));

vi.mock('../../utils/ffmpeg', () => ({ compressVideo: vi.fn(), getVideoDuration: vi.fn(() => Promise.resolve(60)) }));

vi.mock('../../utils/validations', () => ({
  validateFileExists: vi.fn().mockResolvedValue(undefined),
  validatePreset: vi.fn(),
  validateCRF: vi.fn(),
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

// Tests for compress command
describe('compress command', () => {
  let exitSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    vi.mocked(ensureDependencies).mockResolvedValue(true);
    vi.mocked(validateFileExists).mockResolvedValue(undefined);
    vi.mocked(validateCRF).mockReturnValue(undefined);
    vi.mocked(validatePreset).mockReturnValue(undefined);
    vi.mocked(compressVideo).mockResolvedValue(undefined);
  });

  afterEach(() => {
    exitSpy.mockRestore();
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
    // Should compress with default crf and preset
    it('should compress with default crf and preset', async () => {
      await compressAction('input.mp4', {});

      // Expect file existence is validated
      expect(validateFileExists).toHaveBeenCalledWith('input.mp4');

      // Expect crf defaults to 28 and preset to medium
      expect(validateCRF).toHaveBeenCalledWith(28);
      expect(validatePreset).toHaveBeenCalledWith('medium', ['ultrafast', 'fast', 'medium', 'slow']);

      // Expect compressVideo is called with default crf and preset
      expect(compressVideo).toHaveBeenCalledWith(
        'input.mp4',
        'input_compressed.mp4',
        28,
        'medium',
        expect.any(Function)
      );

      // Expect success is logged
      expect(log.succeed).toHaveBeenCalledWith('Compression completed successfully!');
      expect(log.info).toHaveBeenCalledWith(expect.stringContaining('Output:'));
    });

    // Should use provided crf and preset
    it('should use provided crf and preset', async () => {
      await compressAction('input.mp4', { crf: 23, preset: 'slow' });

      // Expect validateCRF and validatePreset receive custom values
      expect(validateCRF).toHaveBeenCalledWith(23);
      expect(validatePreset).toHaveBeenCalledWith('slow', ['ultrafast', 'fast', 'medium', 'slow']);

      // Expect compressVideo is called with custom crf and preset
      expect(compressVideo).toHaveBeenCalledWith('input.mp4', 'input_compressed.mp4', 23, 'slow', expect.any(Function));
    });

    // Should use provided output file
    it('should use provided output file when specified', async () => {
      await compressAction('input.mp4', { output: 'output.avi' });

      // Expect compressVideo is called with the custom output path
      expect(compressVideo).toHaveBeenCalledWith('input.mp4', 'output.avi', 28, 'medium', expect.any(Function));
    });

    // Should call handleError when validateFileExists fails
    it('should call handleError when validateFileExists fails', async () => {
      vi.mocked(validateFileExists).mockRejectedValue(new Error('File not found'));

      await compressAction('input.mp4', {});

      // Expect handleError is called with the validation error
      expect(handleError).toHaveBeenCalledWith(expect.any(Error));
    });

    // Should call handleError when validateCRF fails
    it('should call handleError when validateCRF fails', async () => {
      vi.mocked(validateCRF).mockImplementation(() => {
        throw new Error('Invalid CRF');
      });

      await compressAction('input.mp4', {});

      // Expect handleError is called with the CRF error
      expect(handleError).toHaveBeenCalledWith(expect.any(Error));
    });

    // Should call handleError when validatePreset fails
    it('should call handleError when validatePreset fails', async () => {
      vi.mocked(validatePreset).mockImplementation(() => {
        throw new Error('Invalid preset');
      });

      await compressAction('input.mp4', {});

      // Expect handleError is called with the preset error
      expect(handleError).toHaveBeenCalledWith(expect.any(Error));
    });

    // Should call handleError when compressVideo fails
    it('should call handleError when compressVideo fails', async () => {
      vi.mocked(compressVideo).mockRejectedValue(new Error('Compression failed'));

      await compressAction('input.mp4', {});

      // Expect handleError is called with the compression error and prefix
      expect(handleError).toHaveBeenCalledWith(expect.any(Error), 'Compression failed: ');
    });

    // Should call handleError when ensureDependencies fails
    it('should call handleError when ensureDependencies fails', async () => {
      vi.mocked(ensureDependencies).mockRejectedValue(new Error('Missing dependencies'));

      await compressAction('input.mp4', {});

      // Expect handleError is called with the dependency error
      expect(handleError).toHaveBeenCalledWith(expect.any(Error));
    });

    // Should invoke progress callback during compression
    it('should invoke progress callback during compression', async () => {
      const calls: number[] = [];
      vi.mocked(compressVideo).mockImplementation(async (_input, _output, _crf, _preset, cb) => {
        cb?.(50, 50, 60);
        calls.push(50);
      });

      await compressAction('input.mp4', {});

      // Expect the progress callback was invoked by the compress function
      expect(calls).toContain(50);
      expect(compressVideo).toHaveBeenCalledWith(
        'input.mp4',
        'input_compressed.mp4',
        28,
        'medium',
        expect.any(Function)
      );
    });
  });
});
