import { describe, it, expect, vi, beforeEach } from 'vitest';

import { runCommand } from '../src/utils/dependencies.js';
import {
  parseDuration,
  calculateNumParts,
  getPresetDuration,
  formatSeconds,
  splitVideoReencode,
  splitVideoStreamCopy,
  parseSplitValue,
  PRESET_DURATIONS,
} from '../src/utils/split.js';

vi.mock('../src/utils/dependencies.js', () => ({ runCommand: vi.fn() }));

// Tests for split utils
describe('split utils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Tests for parseDuration
  describe('parseDuration', () => {
    // Should parse plain seconds
    it('should parse plain seconds', () => {
      // Expect parseDuration returns correct seconds
      expect(parseDuration('60')).toBe(60);
      expect(parseDuration('90')).toBe(90);
    });

    // Should parse M:SS format
    it('should parse M:SS format', () => {
      // Expect parseDuration converts M:SS to seconds
      expect(parseDuration('1:30')).toBe(90);
      expect(parseDuration('2:15')).toBe(135);
    });

    // Should parse HH:MM:SS format
    it('should parse HH:MM:SS format', () => {
      // Expect parseDuration converts HH:MM:SS to seconds
      expect(parseDuration('01:30:00')).toBe(5400);
      expect(parseDuration('00:01:30')).toBe(90);
    });

    // Should parse float
    it('should parse float', () => {
      // Expect parseDuration handles decimal values
      expect(parseDuration('1.5')).toBe(1.5);
    });
  });

  // Tests for calculateNumParts
  describe('calculateNumParts', () => {
    // Should calculate correct number of parts
    it('should calculate correct number of parts', () => {
      // Expect calculateNumParts returns correct part count
      expect(calculateNumParts(60, 60)).toBe(1);
      expect(calculateNumParts(120, 60)).toBe(2);
      expect(calculateNumParts(180, 60)).toBe(3);
    });

    // Should round up partial parts
    it('should round up partial parts', () => {
      // Expect calculateNumParts rounds up when duration doesn't divide evenly
      expect(calculateNumParts(61, 60)).toBe(2);
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
      // Expect getPresetDuration returns correct seconds for each preset
      expect(getPresetDuration('instagram')).toBe(60);
      expect(getPresetDuration('ig')).toBe(60);
      expect(getPresetDuration('whatsapp')).toBe(90);
      expect(getPresetDuration('wa')).toBe(90);
      expect(getPresetDuration('facebook')).toBe(120);
      expect(getPresetDuration('fb')).toBe(120);
    });
  });

  // Tests for PRESET_DURATIONS
  describe('PRESET_DURATIONS', () => {
    // Should have all required presets
    it('should have all required presets', () => {
      // Expect PRESET_DURATIONS contains all platform presets
      expect(PRESET_DURATIONS.instagram).toBe(60);
      expect(PRESET_DURATIONS.ig).toBe(60);
      expect(PRESET_DURATIONS.whatsapp).toBe(90);
      expect(PRESET_DURATIONS.wa).toBe(90);
      expect(PRESET_DURATIONS.facebook).toBe(120);
      expect(PRESET_DURATIONS.fb).toBe(120);
    });
  });

  // Tests for formatSeconds
  describe('formatSeconds', () => {
    // Should format seconds correctly
    it('should format seconds correctly', () => {
      // Expect formatSeconds converts seconds to HH:MM:SS format
      expect(formatSeconds(0)).toBe('00:00:00');
      expect(formatSeconds(60)).toBe('00:01:00');
      expect(formatSeconds(90)).toBe('00:01:30');
      expect(formatSeconds(3661)).toBe('01:01:01');
    });

    // Should pad single digits
    it('should pad single digits', () => {
      // Expect formatSeconds pads single digit values with zeros
      expect(formatSeconds(5)).toBe('00:00:05');
      expect(formatSeconds(65)).toBe('00:01:05');
    });
  });

  // Tests for parseSplitValue
  describe('parseSplitValue', () => {
    // Should parse preset names
    it('should parse preset names', () => {
      // Expect parseSplitValue returns type 'preset' for preset names
      expect(parseSplitValue('ig')).toEqual({ type: 'preset', value: 'ig' });
      expect(parseSplitValue('wa')).toEqual({ type: 'preset', value: 'wa' });
      expect(parseSplitValue('fb')).toEqual({ type: 'preset', value: 'fb' });
    });

    // Should parse numeric duration
    it('should parse numeric duration', () => {
      // Expect parseSplitValue returns type 'duration' for numbers
      expect(parseSplitValue('60')).toEqual({ type: 'duration', value: 60 });
      expect(parseSplitValue('90.5')).toEqual({ type: 'duration', value: 90.5 });
    });

    // Should throw error for invalid values
    it('should throw error for invalid values', () => {
      // Expect parseSplitValue throws for invalid input
      expect(() => parseSplitValue('abc')).toThrow('Invalid split value');
      expect(() => parseSplitValue('-10')).toThrow('Invalid split value');
    });
  });

  // Tests for splitVideoReencode
  describe('splitVideoReencode', () => {
    // Should call runCommand with correct ffmpeg arguments
    it('should call runCommand with correct ffmpeg arguments', async () => {
      // Expect splitVideoReencode generates correct output paths
      vi.mocked(runCommand).mockResolvedValue({ stdout: '', stderr: 'frames: 100' });

      const outputPaths = ['/output/video_001.mp4', '/output/video_002.mp4'];
      const result = await splitVideoReencode('input.mp4', outputPaths, 60, 120, 'h264', 23);

      expect(runCommand).toHaveBeenCalledTimes(2);
      expect(result.length).toBe(2);
      expect(result[0]).toBe('/output/video_001.mp4');
      expect(result[1]).toBe('/output/video_002.mp4');
    });

    // Should use hevc codec when specified
    it('should use hevc codec when specified', async () => {
      // Expect splitVideoReencode uses libx265 for hevc codec
      vi.mocked(runCommand).mockResolvedValue({ stdout: '', stderr: 'frames: 100' });

      const outputPaths = ['/output/video_001.mp4'];
      await splitVideoReencode('input.mp4', outputPaths, 60, 120, 'hevc', 20);

      expect(runCommand).toHaveBeenCalledWith(
        'ffmpeg -y -ss "00:00:00" -i "input.mp4" -to "00:01:00" -c:v libx265 -crf 20 -c:a aac "/output/video_001.mp4"',
        expect.any(Function)
      );
    });

    // Should throw error on failure
    it('should throw error on failure', async () => {
      // Expect splitVideoReencode throws when ffmpeg fails
      vi.mocked(runCommand).mockResolvedValue({ stdout: '', stderr: 'error occurred' });

      const outputPaths = ['/output/video_001.mp4'];
      await expect(splitVideoReencode('input.mp4', outputPaths, 60, 120, 'h264', 23)).rejects.toThrow('Split failed');
    });
  });

  // Tests for splitVideoStreamCopy
  describe('splitVideoStreamCopy', () => {
    // Should call runCommand with correct ffmpeg arguments
    it('should call runCommand with correct ffmpeg arguments', async () => {
      // Expect splitVideoStreamCopy generates correct output paths
      vi.mocked(runCommand).mockResolvedValue({ stdout: '', stderr: 'time=00:01:00' });

      const outputPaths = ['/output/video_001.mp4', '/output/video_002.mp4'];
      const result = await splitVideoStreamCopy('input.mp4', outputPaths, 60, 120);

      expect(runCommand).toHaveBeenCalledTimes(2);
      expect(result.length).toBe(2);
      expect(result[0]).toBe('/output/video_001.mp4');
      expect(result[1]).toBe('/output/video_002.mp4');
    });
  });
});
