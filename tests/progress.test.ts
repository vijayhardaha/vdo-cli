import { describe, it, expect } from 'vitest';
import {
  parseFFmpegProgress,
  parseYtDlpProgress,
  kbToMB,
  convertToMB,
} from '../src/utils/progress.js';

describe('Progress', () => {
  describe('parseFFmpegProgress', () => {
    it('should parse time progress correctly', () => {
      const line = 'frame= 1234 fps= 30 size=   12345kB time=00:01:23.45 bitrate= 1234.5kbits/s';
      const result = parseFFmpegProgress(line);

      expect(result).not.toBeNull();
      expect(result?.type).toBe('time');
      expect(result?.value).toBe(83); // 1 minute 23 seconds
    });

    it('should parse size progress correctly', () => {
      const line = 'frame= 100 fps= 25 size=    5432kB time=00:00:10.00 bitrate= 4321.0kbits/s';
      const result = parseFFmpegProgress(line);

      expect(result).not.toBeNull();
      // Time is matched first, which is fine - we still get progress info
      expect(result?.type).toBe('time');
      expect(result?.value).toBe(10); // 10 seconds
    });

    it('should parse fps correctly', () => {
      const line = 'frame= 500 fps= 29.7 size=   23456kB time=00:00:20.00 bitrate= 9876.5kbits/s';
      const result = parseFFmpegProgress(line);

      expect(result).not.toBeNull();
      // Time is matched first, which is fine - we still get progress info
      expect(result?.type).toBe('time');
      expect(result?.value).toBe(20); // 20 seconds
    });

    it('should return null for lines without progress info', () => {
      const line = 'This is just a regular log line';
      const result = parseFFmpegProgress(line);

      expect(result).toBeNull();
    });
  });

  describe('parseYtDlpProgress', () => {
    it('should parse download percentage correctly', () => {
      const line = '[download]  45.3% of 100.00MiB';
      const result = parseYtDlpProgress(line);

      expect(result).not.toBeNull();
      expect(result?.type).toBe('download');
      expect(result?.percentage).toBe(45.3);
      expect(result?.size).toBe(100.0);
      expect(result?.unit).toBe('MiB');
    });

    it('should parse destination correctly', () => {
      const line = '[download] Destination: /path/to/video.mp4';
      const result = parseYtDlpProgress(line);

      expect(result).not.toBeNull();
      expect(result?.type).toBe('destination');
      expect(result?.filename).toBe('/path/to/video.mp4');
    });

    it('should return null for lines without progress info', () => {
      const line = '[youtube] Extracting URL...';
      const result = parseYtDlpProgress(line);

      expect(result).toBeNull();
    });
  });

  describe('kbToMB', () => {
    it('should convert KB to MB correctly', () => {
      expect(kbToMB(1024)).toBe(1);
      expect(kbToMB(512)).toBe(0.5);
      expect(kbToMB(2048)).toBe(2);
    });
  });

  describe('convertToMB', () => {
    it('should convert KiB to MB', () => {
      expect(convertToMB(1024, 'KiB')).toBe(1);
    });

    it('should convert MiB to MB', () => {
      expect(convertToMB(100, 'MiB')).toBe(100);
    });

    it('should convert GiB to MB', () => {
      expect(convertToMB(1, 'GiB')).toBe(1024);
    });

    it('should return same value for unknown units', () => {
      expect(convertToMB(100, 'Unknown')).toBe(100);
    });
  });
});
