import { describe, it, expect, vi, beforeEach } from 'vitest';

import { runCommand } from '@/utils/dependencies';
import {
  calculateNumParts,
  getPresetDuration,
  splitVideoReencode,
  splitVideoStreamCopy,
  parseSplitValue,
} from '@/utils/split';

vi.mock('../dependencies', () => ({ runCommand: vi.fn() }));

// Tests for split utils
describe('split utils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Tests for calculateNumParts
  describe('calculateNumParts', () => {
    // Should calculate correct number of parts
    it('should calculate correct number of parts', () => {
      // Expect calculateNumParts returns correct part count
      expect(calculateNumParts(60, 60)).toBe(1);

      // Expect calculateNumParts handles longer videos
      expect(calculateNumParts(120, 60)).toBe(2);

      expect(calculateNumParts(180, 60)).toBe(3);
    });

    // Should round up partial parts
    it('should round up partial parts', () => {
      // Expect calculateNumParts rounds up when duration doesn't divide evenly
      expect(calculateNumParts(61, 60)).toBe(2);

      // Expect calculateNumParts handles various partial values
      expect(calculateNumParts(121, 60)).toBe(3);
    });

    // Should handle duration shorter than part
    it('should handle duration shorter than part', () => {
      // Expect calculateNumParts returns 1 when duration < partDuration
      expect(calculateNumParts(30, 60)).toBe(1);
    });
  });

  // Tests for getPresetDuration
  describe('getPresetDuration', () => {
    // Should return correct duration for presets
    it('should return correct duration for presets', () => {
      // Expect getPresetDuration returns correct seconds for instagram
      expect(getPresetDuration('instagram')).toBe(60);

      // Expect getPresetDuration handles alias 'ig'
      expect(getPresetDuration('ig')).toBe(60);

      // Expect getPresetDuration handles whatsapp
      expect(getPresetDuration('whatsapp')).toBe(90);

      // Expect getPresetDuration handles alias 'wa'
      expect(getPresetDuration('wa')).toBe(90);

      // Expect getPresetDuration handles facebook
      expect(getPresetDuration('facebook')).toBe(120);

      // Expect getPresetDuration handles alias 'fb'
      expect(getPresetDuration('fb')).toBe(120);
    });
  });

  // Tests for parseSplitValue
  describe('parseSplitValue', () => {
    // Should parse preset names
    it('should parse preset names', () => {
      // Expect parseSplitValue returns type 'preset' for preset names
      expect(parseSplitValue('ig')).toEqual({ type: 'preset', value: 'ig' });

      // Expect parseSplitValue handles other preset aliases
      expect(parseSplitValue('wa')).toEqual({ type: 'preset', value: 'wa' });

      expect(parseSplitValue('fb')).toEqual({ type: 'preset', value: 'fb' });
    });

    // Should parse numeric duration
    it('should parse numeric duration', () => {
      // Expect parseSplitValue returns type 'duration' for numbers
      expect(parseSplitValue('60')).toEqual({ type: 'duration', value: 60 });

      // Expect parseSplitValue handles decimal values
      expect(parseSplitValue('90.5')).toEqual({ type: 'duration', value: 90.5 });
    });

    // Should throw error for invalid values
    it('should throw error for invalid values', () => {
      // Expect parseSplitValue throws for invalid input
      expect(() => parseSplitValue('abc')).toThrow('Invalid split value');

      // Expect parseSplitValue throws for negative values
      expect(() => parseSplitValue('-10')).toThrow('Invalid split value');
    });
  });

  // Tests for splitVideoReencode
  describe('splitVideoReencode', () => {
    // Should call runCommand with correct ffmpeg arguments
    it('should call runCommand with correct ffmpeg arguments', async () => {
      vi.mocked(runCommand).mockResolvedValue({ stdout: '', stderr: 'frames: 100' });

      const outputPaths = ['/output/video_001.mp4', '/output/video_002.mp4'];

      const result = await splitVideoReencode('input.mp4', outputPaths, 60, 120, 'h264', 23);

      // Expect splitVideoReencode generates correct output paths
      expect(runCommand).toHaveBeenCalledTimes(2);

      expect(result.length).toBe(2);

      expect(result[0]).toBe('/output/video_001.mp4');

      expect(result[1]).toBe('/output/video_002.mp4');
    });

    // Should use hevc codec when specified
    it('should use hevc codec when specified', async () => {
      vi.mocked(runCommand).mockResolvedValue({ stdout: '', stderr: 'frames: 100' });

      const outputPaths = ['/output/video_001.mp4'];

      await splitVideoReencode('input.mp4', outputPaths, 60, 120, 'hevc', 20);

      // Expect splitVideoReencode uses libx265 for hevc codec
      expect(runCommand).toHaveBeenCalledWith(
        'ffmpeg -y -ss "00:00:00" -i "input.mp4" -t "00:01:00" -c:v libx265 -crf 20 -c:a aac "/output/video_001.mp4"',
        expect.any(Function)
      );
    });

    // Should throw error on failure
    it('should throw error on failure', async () => {
      vi.mocked(runCommand).mockResolvedValue({ stdout: '', stderr: 'error occurred' });

      const outputPaths = ['/output/video_001.mp4'];

      // Expect splitVideoReencode throws when ffmpeg fails
      await expect(splitVideoReencode('input.mp4', outputPaths, 60, 120, 'h264', 23)).rejects.toThrow('Split failed');
    });

    // Should call onProgress during progress and after each part
    it('should call onProgress during progress and after each part', async () => {
      vi.mocked(runCommand).mockImplementation(async (_cmd, onOutput) => {
        if (onOutput) {
          onOutput('time=00:01:00.00', 'stderr');
        }
        return { stdout: '', stderr: 'frames: 100' };
      });

      const outputPaths = ['/output/video_001.mp4', '/output/video_002.mp4'];
      const onProgress = vi.fn();

      await splitVideoReencode('input.mp4', outputPaths, 60, 120, 'h264', 23, onProgress);

      // Expect onProgress is called during progress reporting with overall percentage
      // Part 0 (i=0): overallProgress = ((0*60+60)/120)*100 = 50
      expect(onProgress).toHaveBeenCalledWith(50, 1, 2);

      // Part 1 (i=1): overallProgress = ((1*60+60)/120)*100 = 100
      expect(onProgress).toHaveBeenCalledWith(100, 2, 2);
    });

    // Should not call onProgress from callback when progress is not time-based
    it('should not call onProgress from callback for non-time progress', async () => {
      vi.mocked(runCommand).mockImplementation(async (_cmd, onOutput) => {
        if (onOutput) {
          onOutput('fps=30', 'stderr');
        }
        return { stdout: '', stderr: 'frames: 100' };
      });

      const outputPaths = ['/output/video_001.mp4'];
      const onProgress = vi.fn();

      await splitVideoReencode('input.mp4', outputPaths, 60, 120, 'h264', 23, onProgress);

      // Expect onProgress is called only for part completion (once), not from callback
      expect(onProgress).toHaveBeenCalledTimes(1);
      expect(onProgress).toHaveBeenCalledWith(100, 1, 1);
    });

    // Should not call onProgress when callback receives progress but onProgress is undefined
    it('should handle progress callback without onProgress', async () => {
      vi.mocked(runCommand).mockImplementation(async (_cmd, onOutput) => {
        if (onOutput) {
          onOutput('time=00:01:00.00', 'stderr');
        }
        return { stdout: '', stderr: 'frames: 100' };
      });

      const outputPaths = ['/output/video_001.mp4'];

      // Expect no error thrown when onProgress is undefined but callback receives progress
      await splitVideoReencode('input.mp4', outputPaths, 60, 120, 'h264', 23);
    });
  });

  // Tests for splitVideoStreamCopy
  describe('splitVideoStreamCopy', () => {
    // Should call runCommand with correct ffmpeg arguments
    it('should call runCommand with correct ffmpeg arguments', async () => {
      vi.mocked(runCommand).mockResolvedValue({ stdout: '', stderr: 'time=00:01:00' });

      const outputPaths = ['/output/video_001.mp4', '/output/video_002.mp4'];

      const result = await splitVideoStreamCopy('input.mp4', outputPaths, 60, 120);

      // Expect splitVideoStreamCopy generates correct output paths
      expect(runCommand).toHaveBeenCalledTimes(2);

      expect(result.length).toBe(2);

      expect(result[0]).toBe('/output/video_001.mp4');

      expect(result[1]).toBe('/output/video_002.mp4');
    });

    // Should call onProgress after each part
    it('should call onProgress after each part', async () => {
      vi.mocked(runCommand).mockResolvedValue({ stdout: '', stderr: '' });

      const outputPaths = ['/output/video_001.mp4', '/output/video_002.mp4'];
      const onProgress = vi.fn();

      await splitVideoStreamCopy('input.mp4', outputPaths, 60, 120, onProgress);

      // Expect onProgress is called after each part with correct progress percentage
      // Part 0 (i=0): partProgress = ((0+1)/2)*100 = 50
      expect(onProgress).toHaveBeenCalledWith(50, 1, 2);

      // Part 1 (i=1): partProgress = ((1+1)/2)*100 = 100
      expect(onProgress).toHaveBeenCalledWith(100, 2, 2);
    });
  });
});
