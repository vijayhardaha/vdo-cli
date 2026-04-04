import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../src/utils/dependencies.js', () => ({ runCommand: vi.fn() }));

import { sanitizeFilename, slugify } from '../src/utils/sanitize.js';

describe('sanitize utils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('sanitizeFilename', () => {
    it('should return untitled for empty string', () => {
      const result = sanitizeFilename('');
      expect(result).toBe('untitled');
    });

    it('should trim whitespace', () => {
      const result = sanitizeFilename('  test video  ');
      expect(result).toBe('test video');
    });

    it('should replace multiple spaces with single space', () => {
      const result = sanitizeFilename('test    video   name');
      expect(result).toBe('test video name');
    });

    it('should remove colon on unix', () => {
      const result = sanitizeFilename('test: video');
      expect(result).toBe('test video');
    });

    it('should truncate to max length', () => {
      const longName = 'a'.repeat(250);
      const result = sanitizeFilename(longName, 100);
      expect(result.length).toBeLessThanOrEqual(100);
    });

    it('should truncate at punctuation boundary near max length', () => {
      const name = 'a'.repeat(100) + '!!!end';
      const result = sanitizeFilename(name, 50);
      expect(result.length).toBeLessThanOrEqual(50);
      expect(result).not.toContain('end');
    });

    it('should filter control characters', () => {
      const result = sanitizeFilename('test\u0000video');
      expect(result).toBe('testvideo');
    });
  });

  describe('slugify', () => {
    it('should convert to lowercase', () => {
      const result = slugify('TEST Video');
      expect(result).toBe('test-video');
    });

    it('should trim whitespace', () => {
      const result = slugify('  test video  ');
      expect(result).toBe('test-video');
    });

    it('should replace spaces and underscores with hyphens', () => {
      const result = slugify('test_video-name');
      expect(result).toBe('test-video-name');
    });

    it('should remove non-word characters except hyphens', () => {
      const result = slugify('test@#$%video');
      expect(result).toBe('testvideo');
    });

    it('should remove leading and trailing hyphens', () => {
      const result = slugify('---test video---');
      expect(result).toBe('test-video');
    });
  });
});
