import { describe, it, expect, vi } from 'vitest';

import {
  validateUrl,
  validateFormat,
  validatePreset,
  validateCRF,
  validateSpeedRate,
  validateBitrate,
  getFileExtension,
  generateOutputFilename,
  validateFileExists,
} from '../src/utils/validations.js';

vi.mock('fs/promises', () => ({ access: vi.fn() }));

// Test suite for validation functions
describe('Validations', () => {
  // Tests for validateFileExists function
  describe('validateFileExists', () => {
    // Should resolve when file exists
    it('should resolve when file exists', async () => {
      const fs = await import('fs/promises');
      vi.mocked(fs.access).mockResolvedValue(undefined);
      // Expect validation to pass without error
      await expect(validateFileExists('exists.mp4')).resolves.toBeUndefined();
    });

    // Should throw error when file does not exist
    it('should throw when file does not exist', async () => {
      const fs = await import('fs/promises');
      vi.mocked(fs.access).mockRejectedValue(new Error('ENOENT'));
      // Expect validation to throw with specific error message
      await expect(validateFileExists('missing.mp4')).rejects.toThrow('File not found: missing.mp4');
    });
  });

  // Tests for validateUrl function
  describe('validateUrl', () => {
    // Should return true for valid HTTP URLs
    it('should return true for valid HTTP URLs', () => {
      expect(validateUrl('http://example.com')).toBe(true);
      expect(validateUrl('http://youtube.com/watch?v=12345')).toBe(true);
    });

    // Should return true for valid HTTPS URLs
    it('should return true for valid HTTPS URLs', () => {
      expect(validateUrl('https://example.com')).toBe(true);
      expect(validateUrl('https://youtube.com/watch?v=12345')).toBe(true);
    });

    // Should return false for invalid URLs
    it('should return false for invalid URLs', () => {
      expect(validateUrl('not-a-url')).toBe(false);
      expect(validateUrl('ftp://example.com')).toBe(false);
      expect(validateUrl('')).toBe(false);
    });
  });

  // Tests for validateFormat function
  describe('validateFormat', () => {
    // Should not throw for valid formats
    it('should not throw for valid formats', () => {
      expect(() => validateFormat('mp4', ['mp4', 'mkv', 'mp3'])).not.toThrow();
      expect(() => validateFormat('MKV', ['mp4', 'mkv', 'mp3'])).not.toThrow();
      expect(() => validateFormat('mp3', ['mp4', 'mkv', 'mp3'])).not.toThrow();
    });

    // Should throw for invalid formats
    it('should throw for invalid formats', () => {
      expect(() => validateFormat('avi', ['mp4', 'mkv', 'mp3'])).toThrow('Invalid format');
      expect(() => validateFormat('flv', ['mp4', 'mkv', 'mp3'])).toThrow('Invalid format');
    });
  });

  // Tests for validatePreset function
  describe('validatePreset', () => {
    // Should not throw for valid presets
    it('should not throw for valid presets', () => {
      expect(() => validatePreset('fast', ['ultrafast', 'fast', 'medium', 'slow'])).not.toThrow();
      expect(() => validatePreset('MEDIUM', ['ultrafast', 'fast', 'medium', 'slow'])).not.toThrow();
    });

    // Should throw for invalid presets
    it('should throw for invalid presets', () => {
      expect(() => validatePreset('extreme', ['ultrafast', 'fast', 'medium', 'slow'])).toThrow('Invalid preset');
      expect(() => validatePreset('custom', ['ultrafast', 'fast', 'medium', 'slow'])).toThrow('Invalid preset');
    });
  });

  // Tests for validateCRF function
  describe('validateCRF', () => {
    // Should not throw for valid CRF values
    it('should not throw for valid CRF values', () => {
      expect(() => validateCRF(0)).not.toThrow();
      expect(() => validateCRF(23)).not.toThrow();
      expect(() => validateCRF(51)).not.toThrow();
      expect(() => validateCRF('28')).not.toThrow();
    });

    // Should throw for invalid CRF values
    it('should throw for invalid CRF values', () => {
      expect(() => validateCRF(-1)).toThrow('CRF value must be between 0 and 51');
      expect(() => validateCRF(52)).toThrow('CRF value must be between 0 and 51');
      expect(() => validateCRF('abc')).toThrow('CRF value must be between 0 and 51');
    });
  });

  // Tests for validateSpeedRate function
  describe('validateSpeedRate', () => {
    // Should not throw for valid speed rates
    it('should not throw for valid speed rates', () => {
      expect(() => validateSpeedRate(0.5)).not.toThrow();
      expect(() => validateSpeedRate(1)).not.toThrow();
      expect(() => validateSpeedRate(2)).not.toThrow();
      expect(() => validateSpeedRate(16)).not.toThrow();
    });

    // Should throw for invalid speed rates
    it('should throw for invalid speed rates', () => {
      expect(() => validateSpeedRate(0)).toThrow('Speed rate must be greater than 0');
      expect(() => validateSpeedRate(17)).toThrow('Speed rate must be greater than 0 and at most 16');
      expect(() => validateSpeedRate(-1)).toThrow('Speed rate must be greater than 0');
      expect(() => validateSpeedRate('abc')).toThrow('Speed rate must be greater than 0');
    });
  });

  // Tests for validateBitrate function
  describe('validateBitrate', () => {
    // Should not throw for valid bitrates
    it('should not throw for valid bitrates', () => {
      expect(() => validateBitrate('192k')).not.toThrow();
      expect(() => validateBitrate('128K')).not.toThrow();
      expect(() => validateBitrate('320k')).not.toThrow();
      expect(() => validateBitrate('128m')).not.toThrow();
      expect(() => validateBitrate('192')).not.toThrow();
    });

    // Should throw for invalid bitrates
    it('should throw for invalid bitrates', () => {
      expect(() => validateBitrate('abc')).toThrow('Bitrate must be a number');
      expect(() => validateBitrate('192kbps')).toThrow('Bitrate must be a number');
      expect(() => validateBitrate('-128k')).toThrow('Bitrate must be a number');
    });
  });

  // Tests for getFileExtension function
  describe('getFileExtension', () => {
    // Should return correct extension
    it('should return correct extension', () => {
      expect(getFileExtension('video.mp4')).toBe('mp4');
      expect(getFileExtension('/path/to/video.MKV')).toBe('mkv');
      expect(getFileExtension('audio.wav')).toBe('wav');
    });

    // Should handle files without extension
    it('should handle files without extension', () => {
      expect(getFileExtension('noextension')).toBe('');
    });
  });

  // Tests for generateOutputFilename function
  describe('generateOutputFilename', () => {
    // Should generate correct output filename
    it('should generate correct output filename', () => {
      expect(generateOutputFilename('/path/to/video.mp4', 'mkv')).toBe('/path/to/video.mkv');
      expect(generateOutputFilename('video.avi', 'mp4')).toBe('video.mp4');
    });

    // Should preserve directory structure
    it('should preserve directory structure', () => {
      const result = generateOutputFilename('/home/user/videos/test.mov', 'mp4');
      expect(result).toBe('/home/user/videos/test.mp4');
    });
  });
});
