import { describe, it, expect, vi, beforeEach } from 'vitest';

import {
  parseSizeToMB,
  calculateTargetBitrate,
  getCRFForQuality,
  compactVideo,
  compactVideoCRF,
} from '../src/utils/compact.js';
import { runCommand } from '../src/utils/dependencies.js';
import { checkAndPromptOverwrite } from '../src/utils/prompt.js';

vi.mock('../src/utils/dependencies.js', () => ({ runCommand: vi.fn() }));

vi.mock('../src/utils/prompt.js', () => ({ checkAndPromptOverwrite: vi.fn().mockResolvedValue(true) }));

describe('compact utils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(checkAndPromptOverwrite).mockResolvedValue(true);
  });

  describe('parseSizeToMB', () => {
    // it: should parse MB correctly
    it('should parse MB correctly', () => {
      expect(parseSizeToMB('25MB')).toBe(25);
      expect(parseSizeToMB('100MB')).toBe(100);
    });

    // it: should parse GB correctly
    it('should parse GB correctly', () => {
      expect(parseSizeToMB('1GB')).toBe(1024);
      expect(parseSizeToMB('0.5GB')).toBe(512);
    });

    // it: should parse KB correctly
    it('should parse KB correctly', () => {
      expect(parseSizeToMB('1024KB')).toBe(1);
    });

    // it: should throw error for invalid format
    it('should throw error for invalid format', () => {
      expect(() => parseSizeToMB('invalid')).toThrow();
    });
  });

  describe('calculateTargetBitrate', () => {
    // it: should calculate correct bitrate
    it('should calculate correct bitrate', () => {
      // 25MB over 60 seconds, 128k audio
      const result = calculateTargetBitrate(25, 60, '128k');
      expect(result).toBeGreaterThan(0);
    });

    // it: should subtract audio bitrate from total
    it('should subtract audio bitrate from total', () => {
      const result = calculateTargetBitrate(50, 60, '256k');
      // Total bitrate = 50 * 8192 / 60 = ~6826 kbps
      // Video bitrate = 6826 - 256 = ~6570 kbps
      expect(result).toBeGreaterThan(256);
    });

    // it: should enforce minimum bitrate of 100
    it('should enforce minimum bitrate of 100', () => {
      // Very small file size over long duration
      const result = calculateTargetBitrate(1, 3600, '128k');
      expect(result).toBeGreaterThanOrEqual(100);
    });
  });

  describe('getCRFForQuality', () => {
    // it: should return correct CRF for presets
    it('should return correct CRF for presets', () => {
      expect(getCRFForQuality('low')).toBe(28);
      expect(getCRFForQuality('medium')).toBe(23);
      expect(getCRFForQuality('high')).toBe(18);
      expect(getCRFForQuality('lossless')).toBe(0);
    });

    // it: should return default for unknown preset
    it('should return default for unknown preset', () => {
      expect(getCRFForQuality('unknown')).toBe(23);
    });
  });

  describe('compactVideo', () => {
    it('should call runCommand with h264 codec for two-pass encoding', async () => {
      vi.mocked(runCommand).mockResolvedValue({ stdout: '', stderr: 'frames: 100' });

      await compactVideo('input.mp4', 'output.mp4', 1000, '128k', 'medium', false);

      expect(runCommand).toHaveBeenCalledTimes(2);
      expect(runCommand).toHaveBeenCalledWith(
        'ffmpeg -y -i "input.mp4" -c:v libx264 -b:v 1000k -pass 1 -preset medium -an -f null "ffmpeg2pass-0.log"',
        expect.any(Function)
      );
      expect(runCommand).toHaveBeenCalledWith(
        'ffmpeg -y -i "input.mp4" -c:v libx264 -b:v 1000k -pass 2 -preset medium -c:a aac -b:a 128k "output.mp4"',
        expect.any(Function)
      );
    });

    it('should call runCommand with hevc codec when specified', async () => {
      vi.mocked(runCommand).mockResolvedValue({ stdout: '', stderr: 'frames: 100' });

      await compactVideo('input.mp4', 'output.mp4', 1000, '128k', 'medium', true);

      expect(runCommand).toHaveBeenCalledWith(
        'ffmpeg -y -i "input.mp4" -c:v libx265 -b:v 1000k -pass 1 -preset medium -an -f null "ffmpeg2pass-0.log"',
        expect.any(Function)
      );
    });

    it('should prompt for overwrite before processing', async () => {
      vi.mocked(runCommand).mockResolvedValue({ stdout: '', stderr: 'frames: 100' });

      await compactVideo('input.mp4', 'output.mp4', 1000, '128k', 'medium', false);

      expect(checkAndPromptOverwrite).toHaveBeenCalledWith(['output.mp4']);
    });

    it('should throw error on pass 1 failure', async () => {
      vi.mocked(runCommand).mockResolvedValue({ stdout: '', stderr: 'error occurred' });

      await expect(compactVideo('input.mp4', 'output.mp4', 1000, '128k', 'medium', false)).rejects.toThrow(
        'Pass 1 failed'
      );
    });

    it('should throw error on pass 2 failure', async () => {
      vi.mocked(runCommand)
        .mockResolvedValueOnce({ stdout: '', stderr: 'frames: 100' })
        .mockResolvedValueOnce({ stdout: '', stderr: 'error occurred' });

      await expect(compactVideo('input.mp4', 'output.mp4', 1000, '128k', 'medium', false)).rejects.toThrow(
        'Pass 2 failed'
      );
    });
  });

  describe('compactVideoCRF', () => {
    it('should call runCommand with h264 codec', async () => {
      vi.mocked(runCommand).mockResolvedValue({ stdout: '', stderr: 'frames: 100' });

      await compactVideoCRF('input.mp4', 'output.mp4', 23, 'medium', '128k', false);

      expect(runCommand).toHaveBeenCalledTimes(1);
      expect(runCommand).toHaveBeenCalledWith(
        'ffmpeg -y -i "input.mp4" -c:v libx264 -crf 23 -preset medium -c:a aac -b:a 128k "output.mp4"',
        expect.any(Function)
      );
    });

    it('should call runCommand with hevc codec when specified', async () => {
      vi.mocked(runCommand).mockResolvedValue({ stdout: '', stderr: 'frames: 100' });

      await compactVideoCRF('input.mp4', 'output.mp4', 23, 'medium', '128k', true);

      expect(runCommand).toHaveBeenCalledWith(
        'ffmpeg -y -i "input.mp4" -c:v libx265 -crf 23 -preset medium -c:a aac -b:a 128k "output.mp4"',
        expect.any(Function)
      );
    });

    it('should prompt for overwrite before processing', async () => {
      vi.mocked(runCommand).mockResolvedValue({ stdout: '', stderr: 'frames: 100' });

      await compactVideoCRF('input.mp4', 'output.mp4', 23, 'medium', '128k', false);

      expect(checkAndPromptOverwrite).toHaveBeenCalledWith(['output.mp4']);
    });

    it('should throw error on failure', async () => {
      vi.mocked(runCommand).mockResolvedValue({ stdout: '', stderr: 'error occurred' });

      await expect(compactVideoCRF('input.mp4', 'output.mp4', 23, 'medium', '128k', false)).rejects.toThrow(
        'Compression failed'
      );
    });
  });
});
