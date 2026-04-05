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

describe('split utils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('parseDuration', () => {
    // it: should parse plain seconds
    it('should parse plain seconds', () => {
      expect(parseDuration('60')).toBe(60);
      expect(parseDuration('90')).toBe(90);
    });

    // it: should parse M:SS format
    it('should parse M:SS format', () => {
      expect(parseDuration('1:30')).toBe(90);
      expect(parseDuration('2:15')).toBe(135);
    });

    // it: should parse HH:MM:SS format
    it('should parse HH:MM:SS format', () => {
      expect(parseDuration('01:30:00')).toBe(5400);
      expect(parseDuration('00:01:30')).toBe(90);
    });

    // it: should parse float
    it('should parse float', () => {
      expect(parseDuration('1.5')).toBe(1.5);
    });
  });

  describe('calculateNumParts', () => {
    // it: should calculate correct number of parts
    it('should calculate correct number of parts', () => {
      expect(calculateNumParts(60, 60)).toBe(1);
      expect(calculateNumParts(120, 60)).toBe(2);
      expect(calculateNumParts(180, 60)).toBe(3);
    });

    // it: should round up partial parts
    it('should round up partial parts', () => {
      expect(calculateNumParts(61, 60)).toBe(2);
      expect(calculateNumParts(121, 60)).toBe(3);
    });

    // it: should handle duration shorter than part
    it('should handle duration shorter than part', () => {
      expect(calculateNumParts(30, 60)).toBe(1);
    });
  });

  describe('getPresetDuration', () => {
    // it: should return correct duration for presets
    it('should return correct duration for presets', () => {
      expect(getPresetDuration('instagram')).toBe(60);
      expect(getPresetDuration('ig')).toBe(60);
      expect(getPresetDuration('whatsapp')).toBe(90);
      expect(getPresetDuration('wa')).toBe(90);
      expect(getPresetDuration('facebook')).toBe(120);
      expect(getPresetDuration('fb')).toBe(120);
    });
  });

  describe('PRESET_DURATIONS', () => {
    // it: should have all required presets
    it('should have all required presets', () => {
      expect(PRESET_DURATIONS.instagram).toBe(60);
      expect(PRESET_DURATIONS.ig).toBe(60);
      expect(PRESET_DURATIONS.whatsapp).toBe(90);
      expect(PRESET_DURATIONS.wa).toBe(90);
      expect(PRESET_DURATIONS.facebook).toBe(120);
      expect(PRESET_DURATIONS.fb).toBe(120);
    });
  });

  describe('formatSeconds', () => {
    // it: should format seconds correctly
    it('should format seconds correctly', () => {
      expect(formatSeconds(0)).toBe('00:00:00');
      expect(formatSeconds(60)).toBe('00:01:00');
      expect(formatSeconds(90)).toBe('00:01:30');
      expect(formatSeconds(3661)).toBe('01:01:01');
    });

    // it: should pad single digits
    it('should pad single digits', () => {
      expect(formatSeconds(5)).toBe('00:00:05');
      expect(formatSeconds(65)).toBe('00:01:05');
    });
  });

  describe('parseSplitValue', () => {
    // it: should parse preset names
    it('should parse preset names', () => {
      expect(parseSplitValue('ig')).toEqual({ type: 'preset', value: 'ig' });
      expect(parseSplitValue('wa')).toEqual({ type: 'preset', value: 'wa' });
      expect(parseSplitValue('fb')).toEqual({ type: 'preset', value: 'fb' });
    });

    // it: should parse numeric duration
    it('should parse numeric duration', () => {
      expect(parseSplitValue('60')).toEqual({ type: 'duration', value: 60 });
      expect(parseSplitValue('90.5')).toEqual({ type: 'duration', value: 90.5 });
    });

    // it: should throw error for invalid values
    it('should throw error for invalid values', () => {
      expect(() => parseSplitValue('abc')).toThrow('Invalid split value');
      expect(() => parseSplitValue('-10')).toThrow('Invalid split value');
    });
  });

  describe('splitVideoReencode', () => {
    it('should call runCommand with correct ffmpeg arguments', async () => {
      vi.mocked(runCommand).mockResolvedValue({ stdout: '', stderr: 'frames: 100' });

      const outputPaths = ['/output/video_001.mp4', '/output/video_002.mp4'];
      const result = await splitVideoReencode('input.mp4', outputPaths, 60, 120, 'h264', 23);

      expect(runCommand).toHaveBeenCalledTimes(2);
      expect(result.length).toBe(2);
      expect(result[0]).toBe('/output/video_001.mp4');
      expect(result[1]).toBe('/output/video_002.mp4');
    });

    it('should use hevc codec when specified', async () => {
      vi.mocked(runCommand).mockResolvedValue({ stdout: '', stderr: 'frames: 100' });

      const outputPaths = ['/output/video_001.mp4'];
      await splitVideoReencode('input.mp4', outputPaths, 60, 120, 'hevc', 20);

      expect(runCommand).toHaveBeenCalledWith(
        'ffmpeg -y -ss "00:00:00" -i "input.mp4" -to "00:01:00" -c:v libx265 -crf 20 -c:a aac "/output/video_001.mp4"',
        expect.any(Function)
      );
    });

    it('should throw error on failure', async () => {
      vi.mocked(runCommand).mockResolvedValue({ stdout: '', stderr: 'error occurred' });

      const outputPaths = ['/output/video_001.mp4'];
      await expect(splitVideoReencode('input.mp4', outputPaths, 60, 120, 'h264', 23)).rejects.toThrow('Split failed');
    });
  });

  describe('splitVideoStreamCopy', () => {
    it('should call runCommand with correct ffmpeg arguments', async () => {
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
