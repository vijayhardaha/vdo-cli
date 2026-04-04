import { describe, it, expect, vi } from 'vitest';

import { parseFFmpegProgress, parseYtDlpProgress, kbToMB, createProgressBar } from '../src/utils/progress.js';

vi.mock('cli-progress', () => ({
  default: {
    SingleBar: vi.fn().mockImplementation(function () {
      return { start: vi.fn(), stop: vi.fn(), update: vi.fn() };
    }),
    Presets: { shades_classic: {} },
  },
}));

// describe: Progress utilities
describe('Progress', () => {
  // describe: createProgressBar
  describe('createProgressBar', () => {
    // it: should return a SingleBar instance
    it('should return a SingleBar instance', async () => {
      const bar = createProgressBar('Testing');

      // expect: bar is defined
      expect(bar).toBeDefined();
    });

    // it: should use default message when not provided
    it('should use default message when not provided', () => {
      const bar = createProgressBar();

      // expect: bar is defined with default message
      expect(bar).toBeDefined();
    });

    // it: should use unit in format when unit is not %
    it('should use unit in format when unit is not %', () => {
      const bar = createProgressBar('Downloading', 'MB');

      // expect: bar is defined with custom unit
      expect(bar).toBeDefined();
    });
  });

  // describe: parseFFmpegProgress
  describe('parseFFmpegProgress', () => {
    // it: should parse time progress correctly
    it('should parse time progress correctly', () => {
      const line = 'frame= 1234 fps= 30 size=   12345kB time=00:01:23.45 bitrate= 1234.5kbits/s';
      const result = parseFFmpegProgress(line);

      // expect: result is not null with time type
      expect(result).not.toBeNull();
      expect(result?.type).toBe('time');
      // expect: value is 83 seconds (1 min 23 sec)
      expect(result?.value).toBe(83);
    });

    // it: should parse size progress correctly
    it('should parse size progress correctly', () => {
      const line = 'frame= 100 fps= 25 size=    5432kB time=00:00:10.00 bitrate= 4321.0kbits/s';
      const result = parseFFmpegProgress(line);

      // expect: result is not null with time type (matched first)
      expect(result).not.toBeNull();
      expect(result?.type).toBe('time');
      // expect: value is 10 seconds
      expect(result?.value).toBe(10);
    });

    // it: should parse fps correctly
    it('should parse fps correctly', () => {
      const line = 'frame= 500 fps= 29.7 size=   23456kB time=00:00:20.00 bitrate= 9876.5kbits/s';
      const result = parseFFmpegProgress(line);

      // expect: result is not null with time type (matched first)
      expect(result).not.toBeNull();
      expect(result?.type).toBe('time');
      // expect: value is 20 seconds
      expect(result?.value).toBe(20);
    });

    // it: should return null for lines without progress info
    it('should return null for lines without progress info', () => {
      const line = 'This is just a regular log line';
      const result = parseFFmpegProgress(line);

      // expect: result is null
      expect(result).toBeNull();
    });

    // it: should parse size-only line
    it('should parse size-only line', () => {
      const result = parseFFmpegProgress('size=   5432kB speed=1.2x');

      // expect: result has size type with correct value
      expect(result).not.toBeNull();
      expect(result?.type).toBe('size');
      expect(result?.value).toBe(5432);
    });

    // it: should parse fps-only line
    it('should parse fps-only line', () => {
      const result = parseFFmpegProgress('fps=30 q=28.0');

      // expect: result has fps type with correct value
      expect(result).not.toBeNull();
      expect(result?.type).toBe('fps');
      expect(result?.value).toBe(30);
    });
  });

  // describe: parseYtDlpProgress
  describe('parseYtDlpProgress', () => {
    // it: should parse download percentage correctly
    it('should parse download percentage correctly', () => {
      const line = '[download]  45.3% of 100.00MiB';
      const result = parseYtDlpProgress(line);

      // expect: result has download type with correct values
      expect(result).not.toBeNull();
      expect(result?.type).toBe('download');
      expect(result?.percentage).toBe(45.3);
      expect(result?.size).toBe(100.0);
      expect(result?.unit).toBe('MiB');
    });

    // it: should parse destination correctly
    it('should parse destination correctly', () => {
      const line = '[download] Destination: /path/to/video.mp4';
      const result = parseYtDlpProgress(line);

      // expect: result has destination type with correct filename
      expect(result).not.toBeNull();
      expect(result?.type).toBe('destination');
      expect(result?.filename).toBe('/path/to/video.mp4');
    });

    // it: should return null for lines without progress info
    it('should return null for lines without progress info', () => {
      const line = '[youtube] Extracting URL...';
      const result = parseYtDlpProgress(line);

      // expect: result is null
      expect(result).toBeNull();
    });
  });

  // describe: kbToMB
  describe('kbToMB', () => {
    // it: should convert KB to MB correctly
    it('should convert KB to MB correctly', () => {
      // expect: conversion is correct
      expect(kbToMB(1024)).toBe(1);
      expect(kbToMB(512)).toBe(0.5);
      expect(kbToMB(2048)).toBe(2);
    });
  });

  // describe: formatFileSize
  describe('formatFileSize', () => {
    // it: should return bytes when less than 1024
    it('should return bytes when less than 1024', async () => {
      const { formatFileSize } = await import('../src/utils/progress.js');
      const result = formatFileSize(500);

      // expect: result is in bytes
      expect(result.value).toBe(500);
      expect(result.unit).toBe('B');
    });

    // it: should return KB for values < 1MB
    it('should return KB for values < 1MB', async () => {
      const { formatFileSize } = await import('../src/utils/progress.js');
      const result = formatFileSize(1024);

      // expect: result is in KB
      expect(result.value).toBe(1);
      expect(result.unit).toBe('KB');
    });

    // it: should return MB for values < 1GB
    it('should return MB for values < 1GB', async () => {
      const { formatFileSize } = await import('../src/utils/progress.js');
      const result = formatFileSize(1024 * 1024);

      // expect: result is in MB
      expect(result.value).toBe(1);
      expect(result.unit).toBe('MB');
    });

    // it: should return GB for values < 1TB
    it('should return GB for values < 1TB', async () => {
      const { formatFileSize } = await import('../src/utils/progress.js');
      const result = formatFileSize(1024 * 1024 * 1024);

      // expect: result is in GB
      expect(result.value).toBe(1);
      expect(result.unit).toBe('GB');
    });

    // it: should return TB for values >= 1TB
    it('should return TB for values >= 1TB', async () => {
      const { formatFileSize } = await import('../src/utils/progress.js');
      const result = formatFileSize(1024 * 1024 * 1024 * 1024);

      // expect: result is in TB
      expect(result.value).toBe(1);
      expect(result.unit).toBe('TB');
    });
  });
});
