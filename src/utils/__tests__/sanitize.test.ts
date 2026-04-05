import { describe, it, expect, vi, beforeEach } from 'vitest';

import { sanitizeFilename, slugify } from '../sanitize';

// Tests for sanitize utilities
describe('sanitize utils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Tests for sanitizeFilename
  describe('sanitizeFilename', () => {
    // Should return 'untitled' for empty string
    it('should return untitled for empty string', () => {
      const result = sanitizeFilename('');

      // Expect empty string becomes 'untitled'
      expect(result).toBe('untitled');
    });

    // Should trim whitespace from input
    it('should trim whitespace', () => {
      const result = sanitizeFilename('  test video  ');

      // Expect whitespace-only input becomes dashes
      expect(result).toBe('test-video');
    });

    // Should replace multiple spaces with single dashes
    it('should replace spaces with dashes', () => {
      const result = sanitizeFilename('test    video   name');

      // Expect multiple spaces become single dash
      expect(result).toBe('test-video-name');
    });

    // Should remove colons and replace spaces with dashes on unix
    it('should remove colon on unix and replace space with dash', () => {
      const result = sanitizeFilename('test: video');

      // Expect colons are stripped, spaces become dashes
      expect(result).toBe('test-video');
    });

    // Should truncate filename to max length
    it('should truncate to max length', () => {
      const longName = 'a'.repeat(250);

      const result = sanitizeFilename(longName, 100);

      // Expect long filename is cut to specified length
      expect(result.length).toBeLessThanOrEqual(100);
    });

    // Should truncate at punctuation boundary
    it('should truncate at punctuation boundary near max length', () => {
      const name = 'a'.repeat(100) + '!!!end';

      const result = sanitizeFilename(name, 50);

      // Expect truncation happens at punctuation, not mid-word
      expect(result.length).toBeLessThanOrEqual(50);

      expect(result).not.toContain('end');
    });

    // Should filter out control characters
    it('should filter control characters', () => {
      const result = sanitizeFilename('test\u0000video');

      // Expect control characters are removed
      expect(result).toBe('testvideo');
    });

    // Should remove trailing dots and spaces on Windows
    it('should remove trailing dots and spaces on Windows', () => {
      const platformMock = vi.spyOn(process, 'platform', 'get');

      platformMock.mockReturnValue('win32');

      const result = sanitizeFilename('test video...   ');

      // Expect trailing punctuation is stripped on Windows
      expect(result).toBe('test-video');

      platformMock.mockRestore();
    });

    // Should truncate at max length when no punctuation exists
    it('should truncate without punctuation when no cutoff symbols exist', () => {
      const longName = 'a'.repeat(250);

      const result = sanitizeFilename(longName, 100);

      // Expect truncation at exact maxLength
      expect(result.length).toBe(100);
    });
  });

  // Tests for slugify
  describe('slugify', () => {
    // Should convert input to lowercase
    it('should convert to lowercase', () => {
      const result = slugify('TEST Video');

      // Expect result is all lowercase
      expect(result).toBe('test-video');
    });

    // Should trim leading and trailing whitespace
    it('should trim whitespace', () => {
      const result = slugify('  test video  ');

      // Expect whitespace is removed
      expect(result).toBe('test-video');
    });

    // Should replace spaces and underscores with hyphens
    it('should replace spaces and underscores with hyphens', () => {
      const result = slugify('test_video-name');

      // Expect mixed separators become hyphens
      expect(result).toBe('test-video-name');
    });

    // Should remove non-word characters except hyphens
    it('should remove non-word characters except hyphens', () => {
      const result = slugify('test@#$%video');

      // Expect special chars are stripped, hyphens preserved
      expect(result).toBe('testvideo');
    });

    // Should remove leading and trailing hyphens
    it('should remove leading and trailing hyphens', () => {
      const result = slugify('---test video---');

      // Expect hyphens at edges are trimmed
      expect(result).toBe('test-video');
    });
  });
});
