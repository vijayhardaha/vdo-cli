import { Command } from 'commander';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { setupSplit } from '@/commands/split';

vi.mock('../../utils/dependencies', () => {
  const mockCheckDependencies = vi.fn();
  const mockEnsureDependencies = vi.fn(async () => {
    const deps = await mockCheckDependencies();
    if (!deps.ok) {
      process.exit(1);
    }
    return true;
  });
  return { checkDependencies: mockCheckDependencies, ensureDependencies: mockEnsureDependencies, runCommand: vi.fn() };
});

vi.mock('../../utils/slice', () => ({ parseTimeToSeconds: vi.fn() }));
vi.mock('../../utils/split', () => ({
  splitVideoReencode: vi.fn(() => Promise.resolve(['output_001.mp4', 'output_002.mp4'])),
  splitVideoStreamCopy: vi.fn(() => Promise.resolve(['output_001.mp4', 'output_002.mp4'])),
  getPresetDuration: vi.fn(),
  calculateNumParts: vi.fn(),
}));

vi.mock('../../utils/validations', () => ({ validateFileExists: vi.fn() }));

vi.mock('../../utils/ffmpeg', () => ({ getVideoDuration: vi.fn() }));

vi.mock('../../utils/progress', () => ({
  createProgressBar: vi.fn(),
  formatFileSize: vi.fn(() => ({ value: 100, unit: 'MB' })),
}));

vi.mock('fs/promises', () => ({ access: vi.fn().mockRejectedValue(new Error('File not found')) }));

vi.mock('../../utils/prompt', () => ({
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
});
