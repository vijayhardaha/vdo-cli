import { describe, it, expect } from 'vitest';
import {
  validateUrl,
  validateFormat,
  validatePreset,
  validateCRF,
  validateSpeedRate,
  validateBitrate,
  getFileExtension,
  generateOutputFilename,
} from '../src/utils/validations.js';

describe('Validations', () => {
  describe('validateUrl', () => {
    it('should return true for valid HTTP URLs', () => {
      expect(validateUrl('http://example.com')).toBe(true);
      expect(validateUrl('http://youtube.com/watch?v=12345')).toBe(true);
    });

    it('should return true for valid HTTPS URLs', () => {
      expect(validateUrl('https://example.com')).toBe(true);
      expect(validateUrl('https://youtube.com/watch?v=12345')).toBe(true);
    });

    it('should return false for invalid URLs', () => {
      expect(validateUrl('not-a-url')).toBe(false);
      expect(validateUrl('ftp://example.com')).toBe(false);
      expect(validateUrl('')).toBe(false);
    });
  });

  describe('validateFormat', () => {
    it('should not throw for valid formats', () => {
      expect(() => validateFormat('mp4', ['mp4', 'mkv', 'mp3'])).not.toThrow();
      expect(() => validateFormat('MKV', ['mp4', 'mkv', 'mp3'])).not.toThrow();
      expect(() => validateFormat('mp3', ['mp4', 'mkv', 'mp3'])).not.toThrow();
    });

    it('should throw for invalid formats', () => {
      expect(() => validateFormat('avi', ['mp4', 'mkv', 'mp3'])).toThrow('Invalid format');
      expect(() => validateFormat('flv', ['mp4', 'mkv', 'mp3'])).toThrow('Invalid format');
    });
  });

  describe('validatePreset', () => {
    it('should not throw for valid presets', () => {
      expect(() => validatePreset('fast', ['ultrafast', 'fast', 'medium', 'slow'])).not.toThrow();
      expect(() => validatePreset('MEDIUM', ['ultrafast', 'fast', 'medium', 'slow'])).not.toThrow();
    });

    it('should throw for invalid presets', () => {
      expect(() => validatePreset('extreme', ['ultrafast', 'fast', 'medium', 'slow'])).toThrow(
        'Invalid preset'
      );
      expect(() => validatePreset('custom', ['ultrafast', 'fast', 'medium', 'slow'])).toThrow(
        'Invalid preset'
      );
    });
  });

  describe('validateCRF', () => {
    it('should not throw for valid CRF values', () => {
      expect(() => validateCRF(0)).not.toThrow();
      expect(() => validateCRF(23)).not.toThrow();
      expect(() => validateCRF(51)).not.toThrow();
      expect(() => validateCRF('28')).not.toThrow();
    });

    it('should throw for invalid CRF values', () => {
      expect(() => validateCRF(-1)).toThrow('CRF value must be between 0 and 51');
      expect(() => validateCRF(52)).toThrow('CRF value must be between 0 and 51');
      expect(() => validateCRF('abc')).toThrow('CRF value must be between 0 and 51');
    });
  });

  describe('validateSpeedRate', () => {
    it('should not throw for valid speed rates', () => {
      expect(() => validateSpeedRate(0.5)).not.toThrow();
      expect(() => validateSpeedRate(1)).not.toThrow();
      expect(() => validateSpeedRate(2)).not.toThrow();
      expect(() => validateSpeedRate(16)).not.toThrow();
    });

    it('should throw for invalid speed rates', () => {
      expect(() => validateSpeedRate(0)).toThrow('Speed rate must be greater than 0');
      expect(() => validateSpeedRate(17)).toThrow(
        'Speed rate must be greater than 0 and at most 16'
      );
      expect(() => validateSpeedRate(-1)).toThrow('Speed rate must be greater than 0');
    });
  });

  describe('validateBitrate', () => {
    it('should not throw for valid bitrates', () => {
      expect(() => validateBitrate('192k')).not.toThrow();
      expect(() => validateBitrate('128K')).not.toThrow();
      expect(() => validateBitrate('320k')).not.toThrow();
      expect(() => validateBitrate('128m')).not.toThrow();
      expect(() => validateBitrate('192')).not.toThrow();
    });

    it('should throw for invalid bitrates', () => {
      expect(() => validateBitrate('abc')).toThrow('Bitrate must be a number');
      expect(() => validateBitrate('192kbps')).toThrow('Bitrate must be a number');
      expect(() => validateBitrate('-128k')).toThrow('Bitrate must be a number');
    });
  });

  describe('getFileExtension', () => {
    it('should return correct extension', () => {
      expect(getFileExtension('video.mp4')).toBe('mp4');
      expect(getFileExtension('/path/to/video.MKV')).toBe('mkv');
      expect(getFileExtension('audio.wav')).toBe('wav');
    });

    it('should handle files without extension', () => {
      expect(getFileExtension('noextension')).toBe('');
    });
  });

  describe('generateOutputFilename', () => {
    it('should generate correct output filename', () => {
      expect(generateOutputFilename('/path/to/video.mp4', 'mkv')).toBe('/path/to/video.mkv');
      expect(generateOutputFilename('video.avi', 'mp4')).toBe('video.mp4');
    });

    it('should preserve directory structure', () => {
      const result = generateOutputFilename('/home/user/videos/test.mov', 'mp4');
      expect(result).toBe('/home/user/videos/test.mp4');
    });
  });
});
