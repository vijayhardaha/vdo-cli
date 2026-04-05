import { describe, it, expect, vi, beforeEach } from 'vitest';

import { sanitizeFilename, slugify } from '../src/utils/sanitize.js';

// Tests for sanitize utilities
describe('sanitize utils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Tests for sanitizeFilename
  describe('sanitizeFilename', () => {
    // Should return 'untitled' for empty string
    it('should return untitled for empty string', () => {
      // Expect empty string becomes 'untitled'
      const result = sanitizeFilename('');
      expect(result).toBe('untitled');
    });

    // Should trim whitespace from input
    it('should trim whitespace', () => {
      // Expect whitespace-only input becomes dashes
      const result = sanitizeFilename('  test video  ');
      expect(result).toBe('test-video');
    });

    // Should replace multiple spaces with single dashes
    it('should replace spaces with dashes', () => {
      // Expect multiple spaces become single dash
      const result = sanitizeFilename('test    video   name');
      expect(result).toBe('test-video-name');
    });

    // Should remove colons and replace spaces with dashes on unix
    it('should remove colon on unix and replace space with dash', () => {
      // Expect colons are stripped, spaces become dashes
      const result = sanitizeFilename('test: video');
      expect(result).toBe('test-video');
    });

    // Should truncate filename to max length
    it('should truncate to max length', () => {
      // Expect long filename is cut to specified length
      const longName = 'a'.repeat(250);
      const result = sanitizeFilename(longName, 100);
      expect(result.length).toBeLessThanOrEqual(100);
    });

    // Should truncate at punctuation boundary
    it('should truncate at punctuation boundary near max length', () => {
      // Expect truncation happens at punctuation, not mid-word
      const name = 'a'.repeat(100) + '!!!end';
      const result = sanitizeFilename(name, 50);
      expect(result.length).toBeLessThanOrEqual(50);
      expect(result).not.toContain('end');
    });

    // Should filter out control characters
    it('should filter control characters', () => {
      // Expect control characters are removed
      const result = sanitizeFilename('test\u0000video');
      expect(result).toBe('testvideo');
    });

    // Should remove trailing dots and spaces on Windows
    it('should remove trailing dots and spaces on Windows', () => {
      // Expect trailing punctuation is stripped on Windows
      const platformMock = vi.spyOn(process, 'platform', 'get');
      platformMock.mockReturnValue('win32');

      const result = sanitizeFilename('test video...   ');

      expect(result).toBe('test-video');

      platformMock.mockRestore();
    });

    // Should truncate at max length when no punctuation exists
    it('should truncate without punctuation when no cutoff symbols exist', () => {
      // Expect truncation at exact maxLength
      const longName = 'a'.repeat(250);
      const result = sanitizeFilename(longName, 100);
      expect(result.length).toBe(100);
    });
  });

  // Tests for slugify
  describe('slugify', () => {
    // Should convert input to lowercase
    it('should convert to lowercase', () => {
      // Expect result is all lowercase
      const result = slugify('TEST Video');
      expect(result).toBe('test-video');
    });

    // Should trim leading and trailing whitespace
    it('should trim whitespace', () => {
      // Expect whitespace is removed
      const result = slugify('  test video  ');
      expect(result).toBe('test-video');
    });

    // Should replace spaces and underscores with hyphens
    it('should replace spaces and underscores with hyphens', () => {
      // Expect mixed separators become hyphens
      const result = slugify('test_video-name');
      expect(result).toBe('test-video-name');
    });

    // Should remove non-word characters except hyphens
    it('should remove non-word characters except hyphens', () => {
      // Expect special chars are stripped, hyphens preserved
      const result = slugify('test@#$%video');
      expect(result).toBe('testvideo');
    });

    // Should remove leading and trailing hyphens
    it('should remove leading and trailing hyphens', () => {
      // Expect hyphens at edges are trimmed
      const result = slugify('---test video---');
      expect(result).toBe('test-video');
    });
  });
});
