import { Command } from 'commander';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { setupSlice, sliceAction } from '../slice.js';

vi.mock('../../utils/dependencies.js', () => ({ checkDependencies: vi.fn(), runCommand: vi.fn() }));

vi.mock('../../utils/slice.js', () => ({
  sliceVideoStreamCopy: vi.fn(),
  sliceVideoReencode: vi.fn(),
  sliceMultipleSegments: vi.fn(),
}));

vi.mock('../../utils/validations.js', () => ({ validateFileExists: vi.fn() }));

vi.mock('fs/promises', () => ({ access: vi.fn().mockRejectedValue(new Error('File not found')) }));

vi.mock('../../utils/prompt.js', () => ({
  checkAndPromptOverwrite: vi.fn().mockResolvedValue(true),
  promptOverwrite: vi.fn().mockResolvedValue(true),
}));

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
      const { checkDependencies } = await import('../../utils/dependencies.js');

      vi.mocked(checkDependencies).mockResolvedValue({ ok: false, missing: ['ffmpeg'] });

      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

      await sliceAction('input.mp4', { start: '10', end: '30' });

      // Expect process.exit is called with 1
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    // Should should exit when start/end not provided
    it('should exit when start/end not provided', async () => {
      const { checkDependencies } = await import('../../utils/dependencies.js');
      const { validateFileExists } = await import('../../utils/validations.js');

      vi.mocked(checkDependencies).mockResolvedValue({ ok: true, missing: [] });
      vi.mocked(validateFileExists).mockResolvedValue(undefined);

      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

      await sliceAction('input.mp4', {});

      // Expect process.exit is called with 1
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    // Should should handle non-Error thrown values in outer catch
    it('should handle non-Error thrown values in outer catch', async () => {
      const { checkDependencies } = await import('../../utils/dependencies.js');

      vi.mocked(checkDependencies).mockRejectedValue('unknown error');

      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

      await sliceAction('input.mp4', { start: '10', end: '30' });

      // Expect process.exit is called with 1
      expect(exitSpy).toHaveBeenCalledWith(1);
    });
  });
});
