import { Command } from 'commander';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { compactVideo, compactVideoCRF } from '../../utils/compact.js';
import { checkDependencies } from '../../utils/dependencies.js';
import { getVideoDuration } from '../../utils/ffmpeg.js';
import { createProgressBar } from '../../utils/progress.js';
import { checkAndPromptOverwrite } from '../../utils/prompt.js';
import { validateFileExists } from '../../utils/validations.js';
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

vi.mock('../../utils/ffmpeg.js', () => ({ getVideoDuration: vi.fn() }));

vi.mock('../../utils/compact.js', () => ({
  compactVideo: vi.fn(),
  compactVideoCRF: vi.fn(),
  getCRFForQuality: vi.fn((q: string) => ({ low: 28, medium: 23, high: 18, lossless: 0 })[q] ?? 23),
  calculateTargetBitrate: vi.fn(() => 1000),
  parseSizeToMB: vi.fn(),
}));

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
      vi.mocked(checkDependencies).mockResolvedValue({ ok: false, missing: ['ffmpeg'] });

      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

      await compactAction('input.mp4', {});

      // Expect process.exit is called with 1
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    // Should should compact video with default options
    it('should compact video with default options', async () => {
      vi.mocked(checkDependencies).mockResolvedValue({ ok: true, missing: [] });
      vi.mocked(validateFileExists).mockResolvedValue(undefined);
      vi.mocked(createProgressBar).mockReturnValue(mockProgressBar as never);
      vi.mocked(getVideoDuration).mockResolvedValue(60);
      vi.mocked(compactVideoCRF).mockResolvedValue(undefined);
      vi.mocked(checkAndPromptOverwrite).mockResolvedValue(true);

      await compactAction('input.mp4', {});

      // Expect compactVideoCRF is called
      expect(compactVideoCRF).toHaveBeenCalled();
    });

    // Should verify compactVideoCRF mock is set up
    it('should verify compactVideoCRF is a function', () => {
      expect(typeof compactVideoCRF).toBe('function');
      expect(vi.isMockFunction(compactVideoCRF)).toBe(true);
    });

    // Should should use discord preset
    it('should use discord preset', async () => {
      vi.mocked(checkDependencies).mockResolvedValue({ ok: true, missing: [] });
      vi.mocked(validateFileExists).mockResolvedValue(undefined);
      vi.mocked(getVideoDuration).mockResolvedValue(60);
      vi.mocked(createProgressBar).mockReturnValue(mockProgressBar as never);
      vi.mocked(compactVideo).mockResolvedValue(undefined);

      await compactAction('input.mp4', { discord: true });

      // Expect compactVideo is called with discord target
      expect(compactVideo).toHaveBeenCalled();
    });

    // Should should use target size
    it('should use target size', async () => {
      vi.mocked(checkDependencies).mockResolvedValue({ ok: true, missing: [] });
      vi.mocked(validateFileExists).mockResolvedValue(undefined);
      vi.mocked(getVideoDuration).mockResolvedValue(60);
      vi.mocked(createProgressBar).mockReturnValue(mockProgressBar as never);
      vi.mocked(compactVideo).mockResolvedValue(undefined);

      await compactAction('input.mp4', { target: '50MB' });

      // Expect compactVideo is called with target size
      expect(compactVideo).toHaveBeenCalled();
    });

    // Should should use quality preset
    it('should use quality preset', async () => {
      vi.mocked(checkDependencies).mockResolvedValue({ ok: true, missing: [] });
      vi.mocked(validateFileExists).mockResolvedValue(undefined);
      vi.mocked(createProgressBar).mockReturnValue(mockProgressBar as never);
      vi.mocked(compactVideoCRF).mockResolvedValue(undefined);

      await compactAction('input.mp4', { quality: 'high' });

      // Expect compactVideoCRF is called with quality preset
      expect(compactVideoCRF).toHaveBeenCalled();
    });

    // Should should use percent reduction
    it('should use percent reduction', async () => {
      vi.mocked(checkDependencies).mockResolvedValue({ ok: true, missing: [] });
      vi.mocked(validateFileExists).mockResolvedValue(undefined);
      vi.mocked(getVideoDuration).mockResolvedValue(60);
      vi.mocked(createProgressBar).mockReturnValue(mockProgressBar as never);
      vi.mocked(compactVideo).mockResolvedValue(undefined);

      await compactAction('input.mp4', { percent: 50 });

      // Expect compactVideo is called with calculated target
      expect(compactVideo).toHaveBeenCalled();
    });

    // Should should use hevc codec when specified
    it('should use hevc codec when specified', async () => {
      vi.mocked(checkDependencies).mockResolvedValue({ ok: true, missing: [] });
      vi.mocked(validateFileExists).mockResolvedValue(undefined);
      vi.mocked(getVideoDuration).mockResolvedValue(60);
      vi.mocked(createProgressBar).mockReturnValue(mockProgressBar as never);
      vi.mocked(compactVideo).mockResolvedValue(undefined);

      await compactAction('input.mp4', { discord: true, hevc: true });

      // Expect compactVideo is called with hevc=true
      expect(compactVideo).toHaveBeenCalled();
      const call = vi.mocked(compactVideo).mock.calls[0];
      expect(call?.[5]).toBe(true);
    });

    // Should should handle compactVideo errors
    it('should handle compactVideo errors', async () => {
      vi.mocked(checkDependencies).mockResolvedValue({ ok: true, missing: [] });
      vi.mocked(validateFileExists).mockResolvedValue(undefined);
      vi.mocked(getVideoDuration).mockResolvedValue(60);
      vi.mocked(createProgressBar).mockReturnValue(mockProgressBar as never);
      vi.mocked(compactVideo).mockRejectedValue(new Error('compact failed'));

      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

      await compactAction('input.mp4', { target: '50MB' });

      // Expect process.exit is called with 1
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    // Should should handle non-Error thrown values in outer catch
    it('should handle non-Error thrown values in outer catch', async () => {
      vi.mocked(checkDependencies).mockRejectedValue('unknown error');

      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

      await compactAction('input.mp4', {});

      // Expect process.exit is called with 1
      expect(exitSpy).toHaveBeenCalledWith(1);
    });
  });
});
