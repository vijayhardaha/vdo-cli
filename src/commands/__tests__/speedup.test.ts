import { Command } from 'commander';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { setupSpeedup } from '@/commands/speedup';

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

vi.mock('../../utils/validations', () => ({ validateFileExists: vi.fn(), validateSpeedRate: vi.fn() }));

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

// Tests for speedup command
describe('speedup command', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
});
