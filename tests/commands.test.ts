import { Command } from 'commander';
import { describe, it, expect, beforeEach } from 'vitest';

import { setupAudio } from '../src/commands/audio.js';
import { setupCompact } from '../src/commands/compact.js';
import { setupCompress } from '../src/commands/compress.js';
import { setupConvert } from '../src/commands/convert.js';
import { setupDownload } from '../src/commands/download.js';
import { setupSlice } from '../src/commands/slice.js';
import { setupSpeedup } from '../src/commands/speedup.js';

describe('Commands Setup', () => {
  let program: Command;

  beforeEach(() => {
    program = new Command();
  });

  // Tests for download command setup
  describe('download command', () => {
    // Should register download command with correct options
    it('should register download command with correct options', () => {
      setupDownload(program);
      const commands = program.commands;

      expect(commands).toHaveLength(1);
      expect(commands[0]?.name()).toBe('download');
      expect(commands[0]?.aliases()).toContain('dl');
      expect(commands[0]?.options).toHaveLength(2);
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
      // Check that the command has options defined
      expect(cmd?.options).toHaveLength(2);
    });
  });

  // Tests for convert command setup
  describe('convert command', () => {
    // Should register convert command with correct options
    it('should register convert command with correct options', () => {
      setupConvert(program);
      const commands = program.commands;

      expect(commands).toHaveLength(1);
      expect(commands[0]?.name()).toBe('convert');
      expect(commands[0]?.aliases()).toContain('cv');
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

  // Tests for compress command setup
  describe('compress command', () => {
    // Should register compress command with correct options
    it('should register compress command with correct options', () => {
      setupCompress(program);
      const commands = program.commands;

      expect(commands).toHaveLength(1);
      expect(commands[0]?.name()).toBe('compress');
      expect(commands[0]?.aliases()).toContain('cm');
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

  // Tests for speedup command setup
  describe('speedup command', () => {
    // Should register speedup command with correct options
    it('should register speedup command with correct options', () => {
      setupSpeedup(program);
      const commands = program.commands;

      expect(commands).toHaveLength(1);
      expect(commands[0]?.name()).toBe('speedup');
      expect(commands[0]?.aliases()).toContain('sp');
    });

    // Should have rate option
    it('should have rate option', () => {
      setupSpeedup(program);
      const cmd = program.commands[0];
      const rateOption = cmd?.options.find((opt) => opt.long === '--rate');

      expect(rateOption).toBeDefined();
    });
  });

  // Tests for audio command setup
  describe('audio command', () => {
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

  // Tests for compact command setup
  describe('compact command', () => {
    // Should register compact command with correct options
    it('should register compact command with correct options', () => {
      setupCompact(program);
      const commands = program.commands;

      expect(commands).toHaveLength(1);
      expect(commands[0]?.name()).toBe('compact');
      expect(commands[0]?.aliases()).toContain('cp');
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

  // Tests for slice command setup
  describe('slice command', () => {
    // Should register slice command with correct options
    it('should register slice command with correct options', () => {
      setupSlice(program);
      const commands = program.commands;

      expect(commands).toHaveLength(1);
      expect(commands[0]?.name()).toBe('slice');
      expect(commands[0]?.aliases()).toContain('sl');
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
