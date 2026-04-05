import { describe, it, expect } from 'vitest';

import {
  parseDuration,
  calculateNumParts,
  getPresetDuration,
  formatSeconds,
  PRESET_DURATIONS,
} from '../src/utils/split.js';

// describe: split utilities
describe('split utils', () => {
  // describe: parseDuration
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

  // describe: calculateNumParts
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

  // describe: getPresetDuration
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

  // describe: PRESET_DURATIONS
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

  // describe: formatSeconds
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
});
