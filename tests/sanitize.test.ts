import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../src/utils/dependencies.js', () => ({ runCommand: vi.fn() }));

import { sanitizeFilename, slugify } from '../src/utils/sanitize.js';

// describe: sanitize utilities
describe('sanitize utils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // describe: sanitizeFilename
  describe('sanitizeFilename', () => {
    // it: should return untitled for empty string
    it('should return untitled for empty string', () => {
      const result = sanitizeFilename('');

      // expect: result is 'untitled'
      expect(result).toBe('untitled');
    });

    // it: should trim whitespace
    it('should trim whitespace', () => {
      const result = sanitizeFilename('  test video  ');

      // expect: result is trimmed with dashes
      expect(result).toBe('test-video');
    });

    // it: should replace spaces with dashes
    it('should replace spaces with dashes', () => {
      const result = sanitizeFilename('test    video   name');

      // expect: multiple spaces become single dash
      expect(result).toBe('test-video-name');
    });

    // it: should remove colon on unix and replace space with dash
    it('should remove colon on unix and replace space with dash', () => {
      const result = sanitizeFilename('test: video');

      // expect: colon is removed, space becomes dash
      expect(result).toBe('test-video');
    });

    // it: should truncate to max length
    it('should truncate to max length', () => {
      const longName = 'a'.repeat(250);
      const result = sanitizeFilename(longName, 100);

      // expect: result length is within max length
      expect(result.length).toBeLessThanOrEqual(100);
    });

    // it: should truncate at punctuation boundary near max length
    it('should truncate at punctuation boundary near max length', () => {
      const name = 'a'.repeat(100) + '!!!end';
      const result = sanitizeFilename(name, 50);

      // expect: result is truncated at punctuation, not in middle of word
      expect(result.length).toBeLessThanOrEqual(50);
      expect(result).not.toContain('end');
    });

    // it: should filter control characters
    it('should filter control characters', () => {
      const result = sanitizeFilename('test\u0000video');

      // expect: control character is removed
      expect(result).toBe('testvideo');
    });

    // it: should remove trailing dots and spaces on Windows
    it('should remove trailing dots and spaces on Windows', () => {
      const platformMock = vi.spyOn(process, 'platform', 'get');
      platformMock.mockReturnValue('win32');

      const result = sanitizeFilename('test video...   ');

      // expect: trailing dots and spaces are removed
      expect(result).toBe('test-video');

      platformMock.mockRestore();
    });

    // it: should truncate without punctuation when no cutoff symbols exist
    it('should truncate without punctuation when no cutoff symbols exist', () => {
      const longName = 'a'.repeat(250);
      const result = sanitizeFilename(longName, 100);

      // expect: result is truncated at maxLength
      expect(result.length).toBe(100);
    });
  });

  // describe: slugify
  describe('slugify', () => {
    // it: should convert to lowercase
    it('should convert to lowercase', () => {
      const result = slugify('TEST Video');

      // expect: result is lowercase
      expect(result).toBe('test-video');
    });

    // it: should trim whitespace
    it('should trim whitespace', () => {
      const result = slugify('  test video  ');

      // expect: result is trimmed
      expect(result).toBe('test-video');
    });

    // it: should replace spaces and underscores with hyphens
    it('should replace spaces and underscores with hyphens', () => {
      const result = slugify('test_video-name');

      // expect: underscores become hyphens
      expect(result).toBe('test-video-name');
    });

    // it: should remove non-word characters except hyphens
    it('should remove non-word characters except hyphens', () => {
      const result = slugify('test@#$%video');

      // expect: special chars are removed
      expect(result).toBe('testvideo');
    });

    // it: should remove leading and trailing hyphens
    it('should remove leading and trailing hyphens', () => {
      const result = slugify('---test video---');

      // expect: leading/trailing hyphens are removed
      expect(result).toBe('test-video');
    });
  });
});
