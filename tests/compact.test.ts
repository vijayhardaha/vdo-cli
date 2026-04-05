import { describe, it, expect } from 'vitest';

import { parseSizeToMB, calculateTargetBitrate, getCRFForQuality } from '../src/utils/compact.js';

// describe: compact utilities
describe('compact utils', () => {
  // describe: parseSizeToMB
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

  // describe: calculateTargetBitrate
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

  // describe: getCRFForQuality
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
});
