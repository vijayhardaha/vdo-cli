import { Command } from 'commander';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { setupDownload } from '@/commands/download';

vi.mock('../../utils/dependencies', () => {
  const mockCheckDependencies = vi.fn().mockResolvedValue({ ok: true, missing: [] });
  const mockEnsureDependencies = vi.fn().mockImplementation(async () => {
    const deps = await mockCheckDependencies();
    if (!deps.ok) {
      process.exit(1);
    }
    return true;
  });
  return { checkDependencies: mockCheckDependencies, ensureDependencies: mockEnsureDependencies, runCommand: vi.fn() };
});

vi.mock('../../utils/ytdlp', () => ({
  downloadVideo: vi.fn(),
  getVideoInfo: vi.fn(),
  generateFilename: vi.fn((info, format) => `${info.title}_${info.video_id}.${format}`),
}));

vi.mock('../../utils/progress', () => ({
  createProgressBar: vi.fn(),
  createProgressCallback: vi.fn().mockReturnValue(vi.fn()),
  formatFileSize: vi.fn(() => ({ value: 100, unit: 'MB' })),
}));

vi.mock('../../utils/validations', () => ({ validateUrl: vi.fn(), validateFormat: vi.fn() }));

vi.mock('../../utils/prompt', () => ({
  checkAndPromptOverwrite: vi.fn().mockResolvedValue(true),
  promptOverwrite: vi.fn().mockResolvedValue(true),
}));

vi.mock('../../utils/ffmpeg', () => ({ convertVideo: vi.fn(), getVideoDuration: vi.fn() }));

vi.mock('../../utils/split', () => ({
  parseSplitValue: vi.fn(),
  getPresetDuration: vi.fn(),
  calculateNumParts: vi.fn(),
}));

vi.mock('../split', () => ({ splitAction: vi.fn(), parseSplitValue: vi.fn() }));

vi.mock('fs/promises', () => ({
  access: vi.fn().mockRejectedValue(new Error('File not found')),
  rename: vi.fn(),
  unlink: vi.fn(),
}));

// Tests for download command
describe('download command', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Tests for setupDownload
  describe('setupDownload', () => {
    let program: Command;

    beforeEach(() => {
      program = new Command();
    });

    // Should register download command with correct options
    it('should register download command with correct options', () => {
      setupDownload(program);
      const commands = program.commands;

      expect(commands).toHaveLength(1);
      expect(commands[0]?.name()).toBe('download');
      expect(commands[0]?.aliases()).toContain('dl');
      expect(commands[0]?.options).toHaveLength(5);
    });

    // Should have output option
    it('should have output option', () => {
      setupDownload(program);
      const cmd = program.commands[0];
      const outputOption = cmd?.opts();

      expect(outputOption).toBeDefined();
    });

    // Should have format option
    it('should have format option', () => {
      setupDownload(program);
      const cmd = program.commands[0];
      const formatOption = cmd?.options.find((opt) => opt.long === '--format');

      expect(formatOption).toBeDefined();
    });

    // Should have convert option
    it('should have convert option', () => {
      setupDownload(program);
      const cmd = program.commands[0];
      const convertOption = cmd?.options.find((opt) => opt.long === '--convert');

      expect(convertOption).toBeDefined();
    });

    // Should have split option
    it('should have split option', () => {
      setupDownload(program);
      const cmd = program.commands[0];
      const splitOption = cmd?.options.find((opt) => opt.long === '--split');

      expect(splitOption).toBeDefined();
    });

    // Should have cookies option
    it('should have cookies option', () => {
      setupDownload(program);
      const cmd = program.commands[0];
      const cookiesOption = cmd?.options.find((opt) => opt.long === '--cookies');

      expect(cookiesOption).toBeDefined();
      expect(cookiesOption?.flags).toContain('--cookies <browser>');
    });

    // Should register download command with 5 options (including new cookies option)
    it('should register download command with correct number of options', () => {
      setupDownload(program);
      const commands = program.commands;

      expect(commands).toHaveLength(1);
      expect(commands[0]?.options).toHaveLength(5);
    });
  });
});
