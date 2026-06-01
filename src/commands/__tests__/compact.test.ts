import { Command } from 'commander';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { setupCompact } from '@/commands/compact';
import { checkAndPromptOverwrite } from '@/utils/prompt';

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

vi.mock('../../utils/output', () => ({
  resolveOutputFile: vi.fn((o) => {
    const ext = o.input.split('.').pop() || 'mp4';
    if (o.output) return o.output;
    const base = o.input.replace(/\.[^.]+$/, '');
    return `${base}${o.suffix || '_compact'}.${ext}`;
  }),
}));

vi.mock('../../utils/prompt', () => ({
  checkAndPromptOverwrite: vi.fn().mockResolvedValue(true),
  promptOverwrite: vi.fn().mockResolvedValue(true),
}));

vi.mock('../../utils/progress', () => ({
  createProgressBar: vi.fn(),
  createProgressCallback: vi.fn().mockReturnValue(vi.fn()),
  formatFileSize: vi.fn(() => ({ value: 100, unit: 'MB' })),
}));

vi.mock('../../utils/compact', () => ({
  compactVideo: vi.fn(),
  compactVideoCRF: vi.fn(),
  getCRFForQuality: vi.fn((q: string) => ({ low: 28, medium: 23, high: 18, lossless: 0 })[q] ?? 23),
  calculateTargetBitrate: vi.fn(() => 1000),
  parseSizeToMB: vi.fn(),
}));

vi.mock('fs/promises', () => ({ access: vi.fn().mockRejectedValue(new Error('File not found')) }));

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
});
