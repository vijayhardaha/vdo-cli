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

// Tests for validation functions
describe('Validations', () => {
  // Tests for validateFileExists
  describe('validateFileExists', () => {
    // Should resolve when file exists
    it('should resolve when file exists', async () => {
      // Expect validation passes for existing file
      const fs = await import('fs/promises');
      vi.mocked(fs.access).mockResolvedValue(undefined);
      await expect(validateFileExists('exists.mp4')).resolves.toBeUndefined();
    });

    // Should throw error when file does not exist
    it('should throw when file does not exist', async () => {
      // Expect error message includes filename
      const fs = await import('fs/promises');
      vi.mocked(fs.access).mockRejectedValue(new Error('ENOENT'));
      await expect(validateFileExists('missing.mp4')).rejects.toThrow('File not found: missing.mp4');
    });
  });

  // Tests for validateUrl
  describe('validateUrl', () => {
    // Should return true for valid HTTP URLs
    it('should return true for valid HTTP URLs', () => {
      // Expect validateUrl returns true for http URLs
      expect(validateUrl('http://example.com')).toBe(true);
      expect(validateUrl('http://youtube.com/watch?v=12345')).toBe(true);
    });

    // Should return true for valid HTTPS URLs
    it('should return true for valid HTTPS URLs', () => {
      // Expect validateUrl returns true for https URLs
      expect(validateUrl('https://example.com')).toBe(true);
      expect(validateUrl('https://youtube.com/watch?v=12345')).toBe(true);
    });

    // Should return false for invalid URLs
    it('should return false for invalid URLs', () => {
      // Expect validateUrl returns false for invalid input
      expect(validateUrl('not-a-url')).toBe(false);
      expect(validateUrl('ftp://example.com')).toBe(false);
      expect(validateUrl('')).toBe(false);
    });
  });

  // Tests for validateFormat
  describe('validateFormat', () => {
    // Should not throw for valid formats
    it('should not throw for valid formats', () => {
      // Expect validateFormat accepts valid formats
      expect(() => validateFormat('mp4', ['mp4', 'mkv', 'mp3'])).not.toThrow();
      expect(() => validateFormat('MKV', ['mp4', 'mkv', 'mp3'])).not.toThrow();
      expect(() => validateFormat('mp3', ['mp4', 'mkv', 'mp3'])).not.toThrow();
    });

    // Should throw for invalid formats
    it('should throw for invalid formats', () => {
      // Expect validateFormat rejects invalid formats
      expect(() => validateFormat('avi', ['mp4', 'mkv', 'mp3'])).toThrow('Invalid format');
      expect(() => validateFormat('flv', ['mp4', 'mkv', 'mp3'])).toThrow('Invalid format');
    });
  });

  // Tests for validatePreset
  describe('validatePreset', () => {
    // Should not throw for valid presets
    it('should not throw for valid presets', () => {
      // Expect validatePreset accepts valid presets
      expect(() => validatePreset('fast', ['ultrafast', 'fast', 'medium', 'slow'])).not.toThrow();
      expect(() => validatePreset('MEDIUM', ['ultrafast', 'fast', 'medium', 'slow'])).not.toThrow();
    });

    // Should throw for invalid presets
    it('should throw for invalid presets', () => {
      // Expect validatePreset rejects invalid presets
      expect(() => validatePreset('extreme', ['ultrafast', 'fast', 'medium', 'slow'])).toThrow('Invalid preset');
      expect(() => validatePreset('custom', ['ultrafast', 'fast', 'medium', 'slow'])).toThrow('Invalid preset');
    });
  });

  // Tests for validateCRF
  describe('validateCRF', () => {
    // Should not throw for valid CRF values (0-51)
    it('should not throw for valid CRF values', () => {
      // Expect validateCRF accepts values 0 to 51
      expect(() => validateCRF(0)).not.toThrow();
      expect(() => validateCRF(23)).not.toThrow();
      expect(() => validateCRF(51)).not.toThrow();
      expect(() => validateCRF('28')).not.toThrow();
    });

    // Should throw for invalid CRF values
    it('should throw for invalid CRF values', () => {
      // Expect validateCRF rejects values outside 0-51
      expect(() => validateCRF(-1)).toThrow('CRF value must be between 0 and 51');
      expect(() => validateCRF(52)).toThrow('CRF value must be between 0 and 51');
      expect(() => validateCRF('abc')).toThrow('CRF value must be between 0 and 51');
    });
  });

  // Tests for validateSpeedRate
  describe('validateSpeedRate', () => {
    // Should not throw for valid speed rates (0.5-16)
    it('should not throw for valid speed rates', () => {
      // Expect validateSpeedRate accepts values 0.5 to 16
      expect(() => validateSpeedRate(0.5)).not.toThrow();
      expect(() => validateSpeedRate(1)).not.toThrow();
      expect(() => validateSpeedRate(2)).not.toThrow();
      expect(() => validateSpeedRate(16)).not.toThrow();
    });

    // Should throw for invalid speed rates
    it('should throw for invalid speed rates', () => {
      // Expect validateSpeedRate rejects invalid values
      expect(() => validateSpeedRate(0)).toThrow('Speed rate must be greater than 0');
      expect(() => validateSpeedRate(17)).toThrow('Speed rate must be greater than 0 and at most 16');
      expect(() => validateSpeedRate(-1)).toThrow('Speed rate must be greater than 0');
      expect(() => validateSpeedRate('abc')).toThrow('Speed rate must be greater than 0');
    });
  });

  // Tests for validateBitrate
  describe('validateBitrate', () => {
    // Should not throw for valid bitrate formats
    it('should not throw for valid bitrates', () => {
      // Expect validateBitrate accepts k, K, m suffixes
      expect(() => validateBitrate('192k')).not.toThrow();
      expect(() => validateBitrate('128K')).not.toThrow();
      expect(() => validateBitrate('320k')).not.toThrow();
      expect(() => validateBitrate('128m')).not.toThrow();
      expect(() => validateBitrate('192')).not.toThrow();
    });

    // Should throw for invalid bitrate formats
    it('should throw for invalid bitrates', () => {
      // Expect validateBitrate rejects invalid formats
      expect(() => validateBitrate('abc')).toThrow('Bitrate must be a number');
      expect(() => validateBitrate('192kbps')).toThrow('Bitrate must be a number');
      expect(() => validateBitrate('-128k')).toThrow('Bitrate must be a number');
    });
  });

  // Tests for getFileExtension
  describe('getFileExtension', () => {
    // Should extract file extension correctly
    it('should return correct extension', () => {
      // Expect getFileExtension extracts lowercase extension
      expect(getFileExtension('video.mp4')).toBe('mp4');
      expect(getFileExtension('/path/to/video.MKV')).toBe('mkv');
      expect(getFileExtension('audio.wav')).toBe('wav');
    });

    // Should return empty string for files without extension
    it('should handle files without extension', () => {
      // Expect getFileExtension returns empty string for no extension
      expect(getFileExtension('noextension')).toBe('');
    });
  });

  // Tests for generateOutputFilename
  describe('generateOutputFilename', () => {
    // Should replace extension with new format
    it('should generate correct output filename', () => {
      // Expect generateOutputFilename changes extension
      expect(generateOutputFilename('/path/to/video.mp4', 'mkv')).toBe('/path/to/video.mkv');
      expect(generateOutputFilename('video.avi', 'mp4')).toBe('video.mp4');
    });

    // Should preserve directory path
    it('should preserve directory structure', () => {
      // Expect full path is maintained with new extension
      const result = generateOutputFilename('/home/user/videos/test.mov', 'mp4');
      expect(result).toBe('/home/user/videos/test.mp4');
    });
  });
});
