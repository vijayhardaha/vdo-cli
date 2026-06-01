import { Command } from 'commander';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { setupSlice } from '@/commands/slice';

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

vi.mock('../../utils/slice', () => ({
  parseTimeToSeconds: vi.fn((t) => parseFloat(t)),
  sliceVideoStreamCopy: vi.fn(),
  sliceVideoReencode: vi.fn(),
  sliceMultipleSegments: vi.fn(),
  formatTimeForFFmpeg: vi.fn((t) => t),
}));

vi.mock('../../utils/validations', () => ({ validateFileExists: vi.fn() }));

vi.mock('../../utils/progress', () => ({
  createProgressBar: vi.fn(),
  formatFileSize: vi.fn(() => ({ value: 100, unit: 'MB' })),
}));

vi.mock('fs/promises', () => ({ access: vi.fn().mockRejectedValue(new Error('File not found')) }));

vi.mock('../../utils/prompt', () => ({
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
});
