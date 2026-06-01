import { Command } from 'commander';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { setupConvert } from '@/commands/convert';

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
  validateFileExists: vi.fn(),
  validateFormat: vi.fn(),
  validatePreset: vi.fn(),
}));

vi.mock('../../utils/progress', () => ({
  createProgressBar: vi.fn(),
  createProgressCallback: vi.fn().mockReturnValue(vi.fn()),
  formatFileSize: vi.fn(() => ({ value: 100, unit: 'MB' })),
}));

vi.mock('fs/promises', () => ({ access: vi.fn().mockRejectedValue(new Error('File not found')) }));

vi.mock('../../utils/prompt', () => ({
  checkAndPromptOverwrite: vi.fn().mockResolvedValue(true),
  promptOverwrite: vi.fn().mockResolvedValue(true),
}));

// Tests for convert command
describe('convert command', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
});
