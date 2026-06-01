import { Command } from 'commander';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { setupCompress } from '@/commands/compress';

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
  validateFileExists: vi.fn(),
  validatePreset: vi.fn(),
  validateCRF: vi.fn(),
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

// Tests for compress command
describe('compress command', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
});
