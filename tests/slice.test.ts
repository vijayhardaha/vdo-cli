import { describe, it, expect, vi, beforeEach } from 'vitest';

import { runCommand } from '../src/utils/dependencies.js';
import {
  sliceVideoStreamCopy,
  sliceVideoReencode,
  sliceMultipleSegments,
  formatTimeForFFmpeg,
} from '../src/utils/slice.js';

vi.mock('../src/utils/dependencies.js', () => ({ runCommand: vi.fn() }));

// Tests for slice utils
describe('slice utils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Tests for formatTimeForFFmpeg
  describe('formatTimeForFFmpeg', () => {
    // Should handle HH:MM:SS format
    it('should handle HH:MM:SS format', () => {
      // Expect formatTimeForFFmpeg returns time as-is
      expect(formatTimeForFFmpeg('00:01:30')).toBe('00:01:30');
    });

    // Should handle M:SS format
    it('should handle M:SS format', () => {
      // Expect formatTimeForFFmpeg converts M:SS to HH:MM:SS
      expect(formatTimeForFFmpeg('1:30')).toBe('00:01:30');
    });

    // Should handle plain seconds
    it('should handle plain seconds', () => {
      // Expect formatTimeForFFmpeg converts seconds to HH:MM:SS
      const result = formatTimeForFFmpeg('90');
      expect(result).toBe('00:01:30');
    });

    // Should handle 0 seconds
    it('should handle 0 seconds', () => {
      // Expect formatTimeForFFmpeg handles zero
      const result = formatTimeForFFmpeg('0');
      expect(result).toBe('00:00:00');
    });

    // Should handle large hours
    it('should handle large hours', () => {
      // Expect formatTimeForFFmpeg formats hours correctly
      const result = formatTimeForFFmpeg('3661');
      expect(result).toBe('01:01:01');
    });
  });

  // Tests for sliceVideoStreamCopy
  describe('sliceVideoStreamCopy', () => {
    // Should call runCommand with correct ffmpeg arguments
    it('should call runCommand with correct ffmpeg arguments', async () => {
      // Expect sliceVideoStreamCopy builds correct ffmpeg command
      vi.mocked(runCommand).mockResolvedValue({ stdout: '', stderr: 'time=00:00:30' });

      await sliceVideoStreamCopy('input.mp4', 'output.mp4', '00:00:10', '00:00:30');

      expect(runCommand).toHaveBeenCalledTimes(1);
      expect(runCommand).toHaveBeenCalledWith(
        'ffmpeg -y -ss "00:00:10" -i "input.mp4" -to "00:00:30" -c copy "output.mp4"',
        expect.any(Function)
      );
    });

    // Should throw error on failure
    it('should throw error on failure', async () => {
      // Expect sliceVideoStreamCopy throws error when ffmpeg fails
      vi.mocked(runCommand).mockResolvedValue({ stdout: '', stderr: 'error occurred' });

      await expect(sliceVideoStreamCopy('input.mp4', 'output.mp4', '00:00:10', '00:00:30')).rejects.toThrow(
        'Slice failed'
      );
    });
  });

  // Tests for sliceVideoReencode
  describe('sliceVideoReencode', () => {
    // Should call runCommand with h264 codec
    it('should call runCommand with h264 codec', async () => {
      // Expect sliceVideoReencode uses libx264 for h264
      vi.mocked(runCommand).mockResolvedValue({ stdout: '', stderr: 'frames: 100' });

      await sliceVideoReencode('input.mp4', 'output.mp4', '00:00:10', '00:00:30', 'h264', 23);

      expect(runCommand).toHaveBeenCalledTimes(1);
      expect(runCommand).toHaveBeenCalledWith(
        'ffmpeg -y -ss "00:00:10" -i "input.mp4" -to "00:00:30" -c:v libx264 -crf 23 -c:a aac "output.mp4"',
        expect.any(Function)
      );
    });

    // Should call runCommand with hevc codec
    it('should call runCommand with hevc codec', async () => {
      // Expect sliceVideoReencode uses libx265 for hevc
      vi.mocked(runCommand).mockResolvedValue({ stdout: '', stderr: 'frames: 100' });

      await sliceVideoReencode('input.mp4', 'output.mp4', '00:00:10', '00:00:30', 'hevc', 20);

      expect(runCommand).toHaveBeenCalledWith(
        'ffmpeg -y -ss "00:00:10" -i "input.mp4" -to "00:00:30" -c:v libx265 -crf 20 -c:a aac "output.mp4"',
        expect.any(Function)
      );
    });

    // Should throw error on failure
    it('should throw error on failure', async () => {
      // Expect sliceVideoReencode throws error when ffmpeg fails
      vi.mocked(runCommand).mockResolvedValue({ stdout: '', stderr: 'error occurred' });

      await expect(sliceVideoReencode('input.mp4', 'output.mp4', '00:00:10', '00:00:30', 'h264', 23)).rejects.toThrow(
        'Slice failed'
      );
    });
  });

  // Tests for sliceMultipleSegments
  describe('sliceMultipleSegments', () => {
    // Should slice multiple segments with stream copy
    it('should slice multiple segments with stream copy', async () => {
      // Expect sliceMultipleSegments generates correct output paths
      vi.mocked(runCommand).mockResolvedValue({ stdout: '', stderr: 'time=00:00:10' });

      const segments = [
        { start: '0', end: '10' },
        { start: '30', end: '45' },
      ];

      const result = await sliceMultipleSegments('input.mp4', '/output', segments, true);

      expect(runCommand).toHaveBeenCalledTimes(2);
      expect(result.length).toBe(2);
      expect(result[0]).toContain('segment_1_0_10.mp4');
      expect(result[1]).toContain('segment_2_30_45.mp4');
    });

    // Should slice multiple segments with reencoding
    it('should slice multiple segments with reencoding', async () => {
      // Expect sliceMultipleSegments processes segments correctly
      vi.mocked(runCommand).mockResolvedValue({ stdout: '', stderr: 'frames: 100' });

      const segments = [{ start: '0', end: '10' }];

      const result = await sliceMultipleSegments('input.mp4', '/output', segments, false);

      expect(runCommand).toHaveBeenCalledTimes(1);
      expect(result.length).toBe(1);
    });

    // Should call onProgress callback
    it('should call onProgress callback', async () => {
      // Expect sliceMultipleSegments updates progress correctly
      vi.mocked(runCommand).mockResolvedValue({ stdout: '', stderr: 'frames: 100' });

      const segments = [
        { start: '0', end: '10' },
        { start: '20', end: '30' },
      ];

      const progressCallback = vi.fn();

      await sliceMultipleSegments('input.mp4', '/output', segments, false, progressCallback);

      expect(progressCallback).toHaveBeenCalledWith(50, 1);
      expect(progressCallback).toHaveBeenCalledWith(100, 2);
    });
  });
});
