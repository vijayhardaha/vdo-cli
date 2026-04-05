import { Command } from 'commander';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { checkAndPromptOverwrite } from '../../utils/prompt.js';
import { setupCompact, compactAction } from '../compact.js';

vi.mock('../../utils/dependencies.js', () => ({ checkDependencies: vi.fn(), runCommand: vi.fn() }));

vi.mock('../../utils/prompt.js', () => ({
  checkAndPromptOverwrite: vi.fn().mockResolvedValue(true),
  promptOverwrite: vi.fn().mockResolvedValue(true),
}));

vi.mock('../../utils/progress.js', () => ({
  createProgressBar: vi.fn(),
  formatFileSize: vi.fn(() => ({ value: 100, unit: 'MB' })),
}));

vi.mock('../../utils/validations.js', () => ({ validateFileExists: vi.fn() }));

vi.mock('fs/promises', () => ({ access: vi.fn().mockRejectedValue(new Error('File not found')) }));

/* Mock progress bar */
const mockProgressBar = { start: vi.fn(), stop: vi.fn(), update: vi.fn() };

// Tests for compact command
describe('compact command', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(checkAndPromptOverwrite).mockResolvedValue(true);
  });

  // Tests for setupCompact
  describe('setupCompact', () => {
    let program: Command;

    beforeEach(() => {
      program = new Command();
    });

    // Should register compact command with correct options
    it('should register compact command with correct options', () => {
      setupCompact(program);
      const commands = program.commands;

      expect(commands).toHaveLength(1);
      expect(commands[0]?.name()).toBe('compact');
      expect(commands[0]?.aliases()).toContain('cpt');
    });

    // Should have target option
    it('should have target option', () => {
      setupCompact(program);
      const cmd = program.commands[0];
      const targetOption = cmd?.options.find((opt) => opt.long === '--target');

      expect(targetOption).toBeDefined();
    });

    // Should have discord option
    it('should have discord option', () => {
      setupCompact(program);
      const cmd = program.commands[0];
      const discordOption = cmd?.options.find((opt) => opt.long === '--discord');

      expect(discordOption).toBeDefined();
    });

    // Should have quality option
    it('should have quality option', () => {
      setupCompact(program);
      const cmd = program.commands[0];
      const qualityOption = cmd?.options.find((opt) => opt.long === '--quality');

      expect(qualityOption).toBeDefined();
    });

    // Should have hevc option
    it('should have hevc option', () => {
      setupCompact(program);
      const cmd = program.commands[0];
      const hevcOption = cmd?.options.find((opt) => opt.long === '--hevc');

      expect(hevcOption).toBeDefined();
    });
  });

  // Tests for compactAction
  describe('compactAction', () => {
    // Should should exit when dependencies missing
    it('should exit when dependencies missing', async () => {
      const { checkDependencies } = await import('../../utils/dependencies.js');

      vi.mocked(checkDependencies).mockResolvedValue({ ok: false, missing: ['ffmpeg'] });

      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

      await compactAction('input.mp4', {});

      // Expect process.exit is called with 1
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    // Should should compact video with default options
    it('should compact video with default options', async () => {
      const { checkDependencies } = await import('../../utils/dependencies.js');
      const { validateFileExists } = await import('../../utils/validations.js');
      const { createProgressBar } = await import('../../utils/progress.js');

      vi.mocked(checkDependencies).mockResolvedValue({ ok: true, missing: [] });
      vi.mocked(validateFileExists).mockResolvedValue(undefined);
      vi.mocked(createProgressBar).mockReturnValue(mockProgressBar as never);

      await compactAction('input.mp4', {});

      // Expect progress bar is started
      expect(mockProgressBar.start).toHaveBeenCalled();
    });

    // Should should handle non-Error thrown values in outer catch
    it('should handle non-Error thrown values in outer catch', async () => {
      const { checkDependencies } = await import('../../utils/dependencies.js');

      vi.mocked(checkDependencies).mockRejectedValue('unknown error');

      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

      await compactAction('input.mp4', {});

      // Expect process.exit is called with 1
      expect(exitSpy).toHaveBeenCalledWith(1);
    });
  });
});
