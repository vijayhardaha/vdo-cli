import { Command } from 'commander';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { setupAudio } from '@/commands/audio';

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

vi.mock('../../utils/ffmpeg', () => ({ extractAudio: vi.fn() }));

vi.mock('../../utils/validations', () => ({
  validateFileExists: vi.fn(),
  validateFormat: vi.fn(),
  validateBitrate: vi.fn(),
}));

vi.mock('fs/promises', () => ({ access: vi.fn().mockRejectedValue(new Error('File not found')) }));

vi.mock('../../utils/prompt', () => ({
  checkAndPromptOverwrite: vi.fn().mockResolvedValue(true),
  promptOverwrite: vi.fn().mockResolvedValue(true),
}));

// Tests for audio command
describe('audio command', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Tests for setupAudio
  describe('setupAudio', () => {
    let program: Command;

    beforeEach(() => {
      program = new Command();
    });

    // Should register audio command with correct options
    it('should register audio command with correct options', () => {
      setupAudio(program);
      const commands = program.commands;

      expect(commands).toHaveLength(1);
      expect(commands[0]?.name()).toBe('audio');
      expect(commands[0]?.aliases()).toContain('au');
    });

    // Should have format option
    it('should have format option', () => {
      setupAudio(program);
      const cmd = program.commands[0];
      const formatOption = cmd?.options.find((opt) => opt.long === '--format');

      expect(formatOption).toBeDefined();
    });

    // Should have bitrate option
    it('should have bitrate option', () => {
      setupAudio(program);
      const cmd = program.commands[0];
      const bitrateOption = cmd?.options.find((opt) => opt.long === '--bitrate');

      expect(bitrateOption).toBeDefined();
    });
  });
});
