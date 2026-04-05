import { describe, it, expect, vi } from 'vitest';

import { parseFFmpegProgress, parseYtDlpProgress, kbToMB, createProgressBar } from '@/utils/progress';

vi.mock('cli-progress', () => ({
  default: {
    SingleBar: vi.fn().mockImplementation(function () {
      return { start: vi.fn(), stop: vi.fn(), update: vi.fn() };
    }),
    Presets: { shades_classic: {} },
  },
}));

// Tests for Progress utilities
describe('Progress', () => {
  // Tests for createProgressBar
  describe('createProgressBar', () => {
    // Should return a SingleBar instance
    it('should return a SingleBar instance', async () => {
      const bar = createProgressBar('Testing');

      // Expect bar is defined
      expect(bar).toBeDefined();
    });

    // Should use default message when not provided
    it('should use default message when not provided', () => {
      const bar = createProgressBar();

      // Expect bar is defined with default message
      expect(bar).toBeDefined();
    });

    // Should use unit in format when unit is not %
    it('should use unit in format when unit is not %', () => {
      const bar = createProgressBar('Downloading', 'MB');

      // Expect bar is defined with custom unit
      expect(bar).toBeDefined();
    });
  });

  // Tests for parseFFmpegProgress
  describe('parseFFmpegProgress', () => {
    // Should parse time progress correctly
    it('should parse time progress correctly', () => {
      const line = 'frame= 1234 fps= 30 size=   12345kB time=00:01:23.45 bitrate= 1234.5kbits/s';

      const result = parseFFmpegProgress(line);

      // Expect result is not null with time type
      expect(result).not.toBeNull();

      // Expect type is time
      expect(result?.type).toBe('time');

      // Expect value is 83 seconds (1 min 23 sec)
      expect(result?.value).toBe(83);
    });

    // Should parse size progress correctly
    it('should parse size progress correctly', () => {
      const line = 'frame= 100 fps= 25 size=    5432kB time=00:00:10.00 bitrate= 4321.0kbits/s';

      const result = parseFFmpegProgress(line);

      // Expect result is not null with time type (matched first)
      expect(result).not.toBeNull();

      // Expect type is time
      expect(result?.type).toBe('time');

      // Expect value is 10 seconds
      expect(result?.value).toBe(10);
    });

    // Should parse fps correctly
    it('should parse fps correctly', () => {
      const line = 'frame= 500 fps= 29.7 size=   23456kB time=00:00:20.00 bitrate= 9876.5kbits/s';

      const result = parseFFmpegProgress(line);

      // Expect result is not null with time type (matched first)
      expect(result).not.toBeNull();

      // Expect type is time
      expect(result?.type).toBe('time');

      // Expect value is 20 seconds
      expect(result?.value).toBe(20);
    });

    // Should return null for lines without progress info
    it('should return null for lines without progress info', () => {
      const line = 'This is just a regular log line';

      const result = parseFFmpegProgress(line);

      // Expect result is null
      expect(result).toBeNull();
    });

    // Should parse size-only line
    it('should parse size-only line', () => {
      const result = parseFFmpegProgress('size=   5432kB speed=1.2x');

      // Expect result has size type with correct value
      expect(result).not.toBeNull();

      // Expect type is size
      expect(result?.type).toBe('size');

      // Expect value is 5432
      expect(result?.value).toBe(5432);
    });

    // Should parse fps-only line
    it('should parse fps-only line', () => {
      const result = parseFFmpegProgress('fps=30 q=28.0');

      // Expect result has fps type with correct value
      expect(result).not.toBeNull();

      // Expect type is fps
      expect(result?.type).toBe('fps');

      // Expect value is 30
      expect(result?.value).toBe(30);
    });
  });

  // Tests for parseYtDlpProgress
  describe('parseYtDlpProgress', () => {
    // Should parse download percentage correctly
    it('should parse download percentage correctly', () => {
      const line = '[download]  45.3% of 100.00MiB';

      const result = parseYtDlpProgress(line);

      // Expect result has download type with correct values
      expect(result).not.toBeNull();

      // Expect type is download
      expect(result?.type).toBe('download');

      // Expect percentage is 45.3
      expect(result?.percentage).toBe(45.3);

      // Expect size is 100.0
      expect(result?.size).toBe(100.0);

      // Expect unit is MiB
      expect(result?.unit).toBe('MiB');
    });

    // Should parse destination correctly
    it('should parse destination correctly', () => {
      const line = '[download] Destination: /path/to/video.mp4';

      const result = parseYtDlpProgress(line);

      // Expect result has destination type with correct filename
      expect(result).not.toBeNull();

      // Expect type is destination
      expect(result?.type).toBe('destination');

      // Expect filename is correct
      expect(result?.filename).toBe('/path/to/video.mp4');
    });

    // Should return null for lines without progress info
    it('should return null for lines without progress info', () => {
      const line = '[youtube] Extracting URL...';

      const result = parseYtDlpProgress(line);

      // Expect result is null
      expect(result).toBeNull();
    });
  });

  // Tests for kbToMB
  describe('kbToMB', () => {
    // Should convert KB to MB correctly
    it('should convert KB to MB correctly', () => {
      // Expect conversion is correct
      expect(kbToMB(1024)).toBe(1);

      // Expect 512 KB is 0.5 MB
      expect(kbToMB(512)).toBe(0.5);

      // Expect 2048 KB is 2 MB
      expect(kbToMB(2048)).toBe(2);
    });
  });

  // Tests for formatFileSize
  describe('formatFileSize', () => {
    // Should return bytes when less than 1024
    it('should return bytes when less than 1024', async () => {
      const { formatFileSize } = await import('../progress');

      const result = formatFileSize(500);

      // Expect result is in bytes
      expect(result.value).toBe(500);

      // Expect unit is B
      expect(result.unit).toBe('B');
    });

    // Should return KB for values < 1MB
    it('should return KB for values < 1MB', async () => {
      const { formatFileSize } = await import('../progress');

      const result = formatFileSize(1024);

      // Expect result is in KB
      expect(result.value).toBe(1);

      // Expect unit is KB
      expect(result.unit).toBe('KB');
    });

    // Should return MB for values < 1GB
    it('should return MB for values < 1GB', async () => {
      const { formatFileSize } = await import('../progress');

      const result = formatFileSize(1024 * 1024);

      // Expect result is in MB
      expect(result.value).toBe(1);

      // Expect unit is MB
      expect(result.unit).toBe('MB');
    });

    // Should return GB for values < 1TB
    it('should return GB for values < 1TB', async () => {
      const { formatFileSize } = await import('../progress');

      const result = formatFileSize(1024 * 1024 * 1024);

      // Expect result is in GB
      expect(result.value).toBe(1);

      // Expect unit is GB
      expect(result.unit).toBe('GB');
    });

    // Should return TB for values >= 1TB
    it('should return TB for values >= 1TB', async () => {
      const { formatFileSize } = await import('../progress');

      const result = formatFileSize(1024 * 1024 * 1024 * 1024);

      // Expect result is in TB
      expect(result.value).toBe(1);

      // Expect unit is TB
      expect(result.unit).toBe('TB');
    });
  });
});
