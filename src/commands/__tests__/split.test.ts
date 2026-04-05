import { Command } from 'commander';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { setupSplit, splitAction } from '../split.js';

vi.mock('../../utils/dependencies.js', () => ({ checkDependencies: vi.fn(), runCommand: vi.fn() }));

vi.mock('../../utils/split.js', () => ({
  splitVideoReencode: vi.fn(() => Promise.resolve(['output_001.mp4', 'output_002.mp4'])),
  splitVideoStreamCopy: vi.fn(() => Promise.resolve(['output_001.mp4', 'output_002.mp4'])),
}));

vi.mock('../../utils/validations.js', () => ({ validateFileExists: vi.fn() }));

vi.mock('fs/promises', () => ({ access: vi.fn().mockRejectedValue(new Error('File not found')) }));

vi.mock('../../utils/prompt.js', () => ({
  checkAndPromptOverwrite: vi.fn().mockResolvedValue(true),
  promptOverwrite: vi.fn().mockResolvedValue(true),
}));

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
