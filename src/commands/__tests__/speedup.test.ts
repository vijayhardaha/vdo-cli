import { Command } from 'commander';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { setupSpeedup, speedupAction } from '@/commands/speedup';
import { ensureDependencies } from '@/utils/dependencies';
import { speedUpVideo } from '@/utils/ffmpeg';
import { log, handleError } from '@/utils/log';
import { validateFileExists, validateSpeedRate } from '@/utils/validations';

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
    return `${base}${o.suffix || '_2x'}.${ext}`;
  }),
}));

vi.mock('../../utils/ffmpeg', () => ({ speedUpVideo: vi.fn(), getVideoDuration: vi.fn(() => Promise.resolve(60)) }));

vi.mock('../../utils/validations', () => ({
  validateFileExists: vi.fn().mockResolvedValue(undefined),
  validateSpeedRate: vi.fn(),
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

// Tests for speedup command
describe('speedup command', () => {
  let exitSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    vi.mocked(ensureDependencies).mockResolvedValue(true);
    vi.mocked(validateFileExists).mockResolvedValue(undefined);
    vi.mocked(validateSpeedRate).mockReturnValue(undefined);
    vi.mocked(speedUpVideo).mockResolvedValue(undefined);
  });

  afterEach(() => {
    exitSpy.mockRestore();
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
    // Should speed up with default rate
    it('should speed up with default rate', async () => {
      await speedupAction('input.mp4', {});

      // Expect file existence is validated
      expect(validateFileExists).toHaveBeenCalledWith('input.mp4');

      // Expect rate defaults to 2
      expect(validateSpeedRate).toHaveBeenCalledWith(2);

      // Expect speedUpVideo is called with default rate
      expect(speedUpVideo).toHaveBeenCalledWith('input.mp4', 'input_2x.mp4', 2, expect.any(Function));

      // Expect success is logged
      expect(log.succeed).toHaveBeenCalledWith('Speed adjustment completed successfully!');
      expect(log.info).toHaveBeenCalledWith(expect.stringContaining('Output:'));
    });

    // Should use provided rate value 0.5
    it('should use provided rate 0.5', async () => {
      await speedupAction('input.mp4', { rate: 0.5 });

      // Expect validateSpeedRate receives custom rate
      expect(validateSpeedRate).toHaveBeenCalledWith(0.5);

      // Expect speedUpVideo is called with custom rate
      expect(speedUpVideo).toHaveBeenCalledWith('input.mp4', 'input_0.5x.mp4', 0.5, expect.any(Function));
    });

    // Should use provided rate value 1.5
    it('should use provided rate 1.5', async () => {
      await speedupAction('input.mp4', { rate: 1.5 });

      // Expect speedUpVideo is called with custom rate
      expect(speedUpVideo).toHaveBeenCalledWith('input.mp4', 'input_1.5x.mp4', 1.5, expect.any(Function));
    });

    // Should use provided output file
    it('should use provided output file when specified', async () => {
      await speedupAction('input.mp4', { output: 'output.mp4' });

      // Expect speedUpVideo is called with the custom output path
      expect(speedUpVideo).toHaveBeenCalledWith('input.mp4', 'output.mp4', 2, expect.any(Function));
    });

    // Should call handleError when validateFileExists fails
    it('should call handleError when validateFileExists fails', async () => {
      vi.mocked(validateFileExists).mockRejectedValue(new Error('File not found'));

      await speedupAction('input.mp4', {});

      // Expect handleError is called with the validation error
      expect(handleError).toHaveBeenCalledWith(expect.any(Error));
    });

    // Should call handleError when validateSpeedRate fails
    it('should call handleError when validateSpeedRate fails', async () => {
      vi.mocked(validateSpeedRate).mockImplementation(() => {
        throw new Error('Invalid rate');
      });

      await speedupAction('input.mp4', {});

      // Expect handleError is called with the rate error
      expect(handleError).toHaveBeenCalledWith(expect.any(Error));
    });

    // Should call handleError when speedUpVideo fails
    it('should call handleError when speedUpVideo fails', async () => {
      vi.mocked(speedUpVideo).mockRejectedValue(new Error('Speed adjustment error'));

      await speedupAction('input.mp4', {});

      // Expect handleError is called with the error and prefix
      expect(handleError).toHaveBeenCalledWith(expect.any(Error), 'Speed adjustment failed: ');
    });

    // Should call handleError when ensureDependencies fails
    it('should call handleError when ensureDependencies fails', async () => {
      vi.mocked(ensureDependencies).mockRejectedValue(new Error('Missing dependencies'));

      await speedupAction('input.mp4', {});

      // Expect handleError is called with the dependency error
      expect(handleError).toHaveBeenCalledWith(expect.any(Error));
    });

    // Should invoke progress callback during speed adjustment
    it('should invoke progress callback during speed adjustment', async () => {
      const calls: number[] = [];
      vi.mocked(speedUpVideo).mockImplementation(async (_input, _output, _rate, cb) => {
        cb?.(50, 50, 60);
        calls.push(50);
      });

      await speedupAction('input.mp4', {});

      // Expect the progress callback was invoked by the speedup function
      expect(calls).toContain(50);
      expect(speedUpVideo).toHaveBeenCalledWith('input.mp4', 'input_2x.mp4', 2, expect.any(Function));
    });
  });
});
