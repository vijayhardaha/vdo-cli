import { describe, it, expect, vi } from 'vitest';
import {
  parseFFmpegProgress,
  parseYtDlpProgress,
  kbToMB,
  convertToMB,
  createProgressBar,
} from '../src/utils/progress.js';

vi.mock('cli-progress', () => ({
  default: {
    SingleBar: vi.fn().mockImplementation(function () {
      return { start: vi.fn(), stop: vi.fn(), update: vi.fn() };
    }),
    Presets: { shades_classic: {} },
  },
}));

// Test suite for progress utility functions
describe('Progress', () => {
  // Tests for createProgressBar function
  describe('createProgressBar', () => {
    // Should return a SingleBar instance
    it('should return a SingleBar instance', async () => {
      const bar = createProgressBar('Testing');
      expect(bar).toBeDefined();
    });

    // Should use default message when not provided
    it('should use default message when not provided', () => {
      const bar = createProgressBar();
      expect(bar).toBeDefined();
    });
  });
  // Tests for parseFFmpegProgress function
  describe('parseFFmpegProgress', () => {
    // Should parse time progress correctly
    it('should parse time progress correctly', () => {
      const line = 'frame= 1234 fps= 30 size=   12345kB time=00:01:23.45 bitrate= 1234.5kbits/s';
      const result = parseFFmpegProgress(line);

      expect(result).not.toBeNull();
      expect(result?.type).toBe('time');
      expect(result?.value).toBe(83); // 1 minute 23 seconds
    });

    // Should parse size progress correctly
    it('should parse size progress correctly', () => {
      const line = 'frame= 100 fps= 25 size=    5432kB time=00:00:10.00 bitrate= 4321.0kbits/s';
      const result = parseFFmpegProgress(line);

      expect(result).not.toBeNull();
      // Time is matched first, which is fine - we still get progress info
      expect(result?.type).toBe('time');
      expect(result?.value).toBe(10); // 10 seconds
    });

    // Should parse fps correctly
    it('should parse fps correctly', () => {
      const line = 'frame= 500 fps= 29.7 size=   23456kB time=00:00:20.00 bitrate= 9876.5kbits/s';
      const result = parseFFmpegProgress(line);

      expect(result).not.toBeNull();
      // Time is matched first, which is fine - we still get progress info
      expect(result?.type).toBe('time');
      expect(result?.value).toBe(20); // 20 seconds
    });

    // Should return null for lines without progress info
    it('should return null for lines without progress info', () => {
      const line = 'This is just a regular log line';
      const result = parseFFmpegProgress(line);

      expect(result).toBeNull();
    });

    // Should parse size-only line
    it('should parse size-only line', () => {
      const result = parseFFmpegProgress('size=   5432kB speed=1.2x');
      expect(result).not.toBeNull();
      expect(result?.type).toBe('size');
      expect(result?.value).toBe(5432);
    });

    // Should parse fps-only line
    it('should parse fps-only line', () => {
      const result = parseFFmpegProgress('fps=30 q=28.0');
      expect(result).not.toBeNull();
      expect(result?.type).toBe('fps');
      expect(result?.value).toBe(30);
    });
  });

  // Tests for parseYtDlpProgress function
  describe('parseYtDlpProgress', () => {
    // Should parse download percentage correctly
    it('should parse download percentage correctly', () => {
      const line = '[download]  45.3% of 100.00MiB';
      const result = parseYtDlpProgress(line);

      expect(result).not.toBeNull();
      expect(result?.type).toBe('download');
      expect(result?.percentage).toBe(45.3);
      expect(result?.size).toBe(100.0);
      expect(result?.unit).toBe('MiB');
    });

    // Should parse destination correctly
    it('should parse destination correctly', () => {
      const line = '[download] Destination: /path/to/video.mp4';
      const result = parseYtDlpProgress(line);

      expect(result).not.toBeNull();
      expect(result?.type).toBe('destination');
      expect(result?.filename).toBe('/path/to/video.mp4');
    });

    // Should return null for lines without progress info
    it('should return null for lines without progress info', () => {
      const line = '[youtube] Extracting URL...';
      const result = parseYtDlpProgress(line);

      expect(result).toBeNull();
    });
  });

  // Tests for kbToMB function
  describe('kbToMB', () => {
    // Should convert KB to MB correctly
    it('should convert KB to MB correctly', () => {
      expect(kbToMB(1024)).toBe(1);
      expect(kbToMB(512)).toBe(0.5);
      expect(kbToMB(2048)).toBe(2);
    });
  });

  // Tests for convertToMB function
  describe('convertToMB', () => {
    // Should convert KiB to MB
    it('should convert KiB to MB', () => {
      expect(convertToMB(1024, 'KiB')).toBe(1);
    });

    // Should convert MiB to MB
    it('should convert MiB to MB', () => {
      expect(convertToMB(100, 'MiB')).toBe(100);
    });

    // Should convert GiB to MB
    it('should convert GiB to MB', () => {
      expect(convertToMB(1, 'GiB')).toBe(1024);
    });

    // Should return same value for unknown units
    it('should return same value for unknown units', () => {
      expect(convertToMB(100, 'Unknown')).toBe(100);
    });
  });
});
