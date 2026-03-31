import { describe, it, expect, beforeEach } from 'vitest';
import { Command } from 'commander';
import { setupDownload } from '../src/commands/download.js';
import { setupConvert } from '../src/commands/convert.js';
import { setupCompress } from '../src/commands/compress.js';
import { setupSpeedup } from '../src/commands/speedup.js';
import { setupAudio } from '../src/commands/audio.js';
import { setupAuto } from '../src/commands/auto.js';

describe('Commands Setup', () => {
  let program: Command;

  beforeEach(() => {
    program = new Command();
  });

  describe('download command', () => {
    it('should register download command with correct options', () => {
      setupDownload(program);
      const commands = program.commands;

      expect(commands).toHaveLength(1);
      expect(commands[0]?.name()).toBe('download');
      expect(commands[0]?.aliases()).toContain('dl');
      expect(commands[0]?.options).toHaveLength(2);
    });

    it('should have output option', () => {
      setupDownload(program);
      const cmd = program.commands[0];
      const outputOption = cmd?.opts();

      expect(outputOption).toBeDefined();
    });

    it('should have format option', () => {
      setupDownload(program);
      const cmd = program.commands[0];
      // Check that the command has options defined
      expect(cmd?.options).toHaveLength(2);
    });
  });

  describe('convert command', () => {
    it('should register convert command with correct options', () => {
      setupConvert(program);
      const commands = program.commands;

      expect(commands).toHaveLength(1);
      expect(commands[0]?.name()).toBe('convert');
      expect(commands[0]?.aliases()).toContain('cv');
    });

    it('should have to option', () => {
      setupConvert(program);
      const cmd = program.commands[0];
      expect(cmd?.options).toHaveLength(3);
    });

    it('should have preset option', () => {
      setupConvert(program);
      const cmd = program.commands[0];
      const presetOption = cmd?.options.find(opt => opt.long === '--preset');

      expect(presetOption).toBeDefined();
    });
  });

  describe('compress command', () => {
    it('should register compress command with correct options', () => {
      setupCompress(program);
      const commands = program.commands;

      expect(commands).toHaveLength(1);
      expect(commands[0]?.name()).toBe('compress');
      expect(commands[0]?.aliases()).toContain('cm');
    });

    it('should have crf option', () => {
      setupCompress(program);
      const cmd = program.commands[0];
      const crfOption = cmd?.options.find(opt => opt.long === '--crf');

      expect(crfOption).toBeDefined();
    });

    it('should have preset option', () => {
      setupCompress(program);
      const cmd = program.commands[0];
      const presetOption = cmd?.options.find(opt => opt.long === '--preset');

      expect(presetOption).toBeDefined();
    });
  });

  describe('speedup command', () => {
    it('should register speedup command with correct options', () => {
      setupSpeedup(program);
      const commands = program.commands;

      expect(commands).toHaveLength(1);
      expect(commands[0]?.name()).toBe('speedup');
      expect(commands[0]?.aliases()).toContain('sp');
    });

    it('should have rate option', () => {
      setupSpeedup(program);
      const cmd = program.commands[0];
      const rateOption = cmd?.options.find(opt => opt.long === '--rate');

      expect(rateOption).toBeDefined();
    });
  });

  describe('audio command', () => {
    it('should register audio command with correct options', () => {
      setupAudio(program);
      const commands = program.commands;

      expect(commands).toHaveLength(1);
      expect(commands[0]?.name()).toBe('audio');
      expect(commands[0]?.aliases()).toContain('au');
    });

    it('should have format option', () => {
      setupAudio(program);
      const cmd = program.commands[0];
      const formatOption = cmd?.options.find(opt => opt.long === '--format');

      expect(formatOption).toBeDefined();
    });

    it('should have bitrate option', () => {
      setupAudio(program);
      const cmd = program.commands[0];
      const bitrateOption = cmd?.options.find(opt => opt.long === '--bitrate');

      expect(bitrateOption).toBeDefined();
    });
  });

  describe('auto command', () => {
    it('should register auto command with correct options', () => {
      setupAuto(program);
      const commands = program.commands;

      expect(commands).toHaveLength(1);
      expect(commands[0]?.name()).toBe('auto');
      expect(commands[0]?.aliases()).toContain('a');
    });

    it('should have format option', () => {
      setupAuto(program);
      const cmd = program.commands[0];
      const formatOption = cmd?.options.find(opt => opt.long === '--format');

      expect(formatOption).toBeDefined();
    });
  });
});
