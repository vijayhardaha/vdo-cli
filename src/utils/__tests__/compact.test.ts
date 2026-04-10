import { describe, it, expect, vi, beforeEach } from 'vitest';

import {
  parseSizeToMB,
  calculateTargetBitrate,
  getCRFForQuality,
  compactVideo,
  compactVideoCRF,
} from '@/utils/compact';
import { runCommand } from '@/utils/dependencies';
import { checkAndPromptOverwrite } from '@/utils/prompt';

vi.mock('../dependencies', () => ({ runCommand: vi.fn() }));

vi.mock('../prompt', () => ({ checkAndPromptOverwrite: vi.fn().mockResolvedValue(true) }));

// Tests for compact utils
describe('compact utils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(checkAndPromptOverwrite).mockResolvedValue(true);
  });

  // Tests for parseSizeToMB
  describe('parseSizeToMB', () => {
    // Should parse MB correctly
    it('should parse MB correctly', () => {
      // Expect parseSizeToMB('25MB') returns 25
      expect(parseSizeToMB('25MB')).toBe(25);
      // Expect parseSizeToMB('100MB') returns 100
      expect(parseSizeToMB('100MB')).toBe(100);
    });

    // Should parse GB correctly by converting to MB
    it('should parse GB correctly', () => {
      // Expect parseSizeToMB('1GB') returns 1024
      expect(parseSizeToMB('1GB')).toBe(1024);
      // Expect parseSizeToMB('0.5GB') returns 512
      expect(parseSizeToMB('0.5GB')).toBe(512);
    });

    // Should parse KB correctly by converting to MB
    it('should parse KB correctly', () => {
      // Expect parseSizeToMB('1024KB') returns 1
      expect(parseSizeToMB('1024KB')).toBe(1);
    });

    // Should throw error for invalid format
    it('should throw error for invalid format', () => {
      // Expect parseSizeToMB throws for invalid input
      expect(() => parseSizeToMB('invalid')).toThrow();
    });
  });

  // Tests for calculateTargetBitrate
  describe('calculateTargetBitrate', () => {
    // Should calculate correct video bitrate
    it('should calculate correct bitrate', () => {
      // Expect bitrate is positive for valid inputs
      const result = calculateTargetBitrate(25, 60, '128k');
      expect(result).toBeGreaterThan(0);
    });

    // Should subtract audio bitrate from total
    it('should subtract audio bitrate from total', () => {
      // Expect video bitrate accounts for audio deduction
      const result = calculateTargetBitrate(50, 60, '256k');
      expect(result).toBeGreaterThan(256);
    });

    // Should enforce minimum bitrate of 100
    it('should enforce minimum bitrate of 100', () => {
      // Expect bitrate doesn't go below 100 for edge cases
      const result = calculateTargetBitrate(1, 3600, '128k');
      expect(result).toBeGreaterThanOrEqual(100);
    });
  });

  // Tests for getCRFForQuality
  describe('getCRFForQuality', () => {
    // Should return correct CRF for quality presets
    it('should return correct CRF for presets', () => {
      // Expect getCRFForQuality('low') returns 28
      expect(getCRFForQuality('low')).toBe(28);
      // Expect getCRFForQuality('medium') returns 23
      expect(getCRFForQuality('medium')).toBe(23);
      // Expect getCRFForQuality('high') returns 18
      expect(getCRFForQuality('high')).toBe(18);
      // Expect getCRFForQuality('lossless') returns 0
      expect(getCRFForQuality('lossless')).toBe(0);
    });

    // Should return default CRF for unknown preset
    it('should return default for unknown preset', () => {
      // Expect unknown preset falls back to medium CRF
      expect(getCRFForQuality('unknown')).toBe(23);
    });
  });

  // Tests for compactVideo (two-pass encoding)
  describe('compactVideo', () => {
    // Should perform two-pass encoding with h264 codec
    it('should call runCommand with h264 codec for two-pass encoding', async () => {
      vi.mocked(runCommand).mockResolvedValue({ stdout: '', stderr: 'frames: 100' });

      await compactVideo('input.mp4', 'output.mp4', 1000, '128k', 'medium', false);

      // Expect compactVideo runs ffprobe + two ffmpeg passes
      expect(runCommand).toHaveBeenCalledTimes(3);
      // Expect pass 1 uses libx264 with pass 1 flag
      expect(runCommand).toHaveBeenCalledWith(
        'ffmpeg -y -i "input.mp4" -c:v libx264 -b:v 1000k -pass 1 -preset medium -an -f null "ffmpeg2pass-0.log"',
        expect.any(Function)
      );
      // Expect pass 2 uses libx264 with pass 2 flag and audio
      expect(runCommand).toHaveBeenCalledWith(
        'ffmpeg -y -i "input.mp4" -c:v libx264 -b:v 1000k -pass 2 -preset medium -c:a aac -b:a 128k "output.mp4"',
        expect.any(Function)
      );
    });

    // Should use hevc codec when specified
    it('should call runCommand with hevc codec when specified', async () => {
      vi.mocked(runCommand).mockResolvedValue({ stdout: '', stderr: 'frames: 100' });

      await compactVideo('input.mp4', 'output.mp4', 1000, '128k', 'medium', true);

      // Expect compactVideo uses libx265 for hevc
      expect(runCommand).toHaveBeenCalledWith(
        'ffmpeg -y -i "input.mp4" -c:v libx265 -b:v 1000k -pass 1 -preset medium -an -f null "ffmpeg2pass-0.log"',
        expect.any(Function)
      );
    });

    // Should throw error on pass 1 failure
    it('should throw error on pass 1 failure', async () => {
      vi.mocked(runCommand).mockResolvedValue({ stdout: '', stderr: 'error occurred' });

      // Expect error message indicates pass 1 failure
      await expect(compactVideo('input.mp4', 'output.mp4', 1000, '128k', 'medium', false)).rejects.toThrow(
        'Pass 1 failed'
      );
    });

    // Should throw error on pass 2 failure
    it('should throw error on pass 2 failure', async () => {
      vi.mocked(runCommand)
        .mockResolvedValueOnce({ stdout: '10', stderr: '' }) // ffprobe returns duration
        .mockResolvedValueOnce({ stdout: '', stderr: 'frames: 100' }) // pass 1
        .mockResolvedValueOnce({ stdout: '', stderr: 'error occurred' }); // pass 2 fails

      // Expect error message indicates pass 2 failure
      await expect(compactVideo('input.mp4', 'output.mp4', 1000, '128k', 'medium', false)).rejects.toThrow(
        'Pass 2 failed'
      );
    });
  });

  // Tests for compactVideoCRF (single-pass encoding)
  describe('compactVideoCRF', () => {
    // Should use h264 codec with CRF
    it('should call runCommand with h264 codec', async () => {
      vi.mocked(runCommand).mockResolvedValue({ stdout: '', stderr: 'frames: 100' });

      await compactVideoCRF('input.mp4', 'output.mp4', 23, 'medium', '128k', false);

      // Expect compactVideoCRF uses libx264 (ffprobe + ffmpeg)
      expect(runCommand).toHaveBeenCalledTimes(2);
      expect(runCommand).toHaveBeenCalledWith(
        'ffmpeg -y -i "input.mp4" -c:v libx264 -crf 23 -preset medium -c:a aac -b:a 128k "output.mp4"',
        expect.any(Function)
      );
    });

    // Should use hevc codec when specified
    it('should call runCommand with hevc codec when specified', async () => {
      vi.mocked(runCommand).mockResolvedValue({ stdout: '', stderr: 'frames: 100' });

      await compactVideoCRF('input.mp4', 'output.mp4', 23, 'medium', '128k', true);

      // Expect compactVideoCRF uses libx265 for hevc
      expect(runCommand).toHaveBeenCalledWith(
        'ffmpeg -y -i "input.mp4" -c:v libx265 -crf 23 -preset medium -c:a aac -b:a 128k "output.mp4"',
        expect.any(Function)
      );
    });

    // Should throw error on failure
    it('should throw error on failure', async () => {
      vi.mocked(runCommand).mockResolvedValue({ stdout: '', stderr: 'error occurred' });

      // Expect error message indicates compression failure
      await expect(compactVideoCRF('input.mp4', 'output.mp4', 23, 'medium', '128k', false)).rejects.toThrow(
        'Compression failed'
      );
    });
  });
});
