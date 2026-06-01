import { describe, it, expect } from 'vitest';

import { resolveOutputFile, getFileExtension, generateOutputFilename } from '@/utils/output';

// Tests for resolveOutputFile utility
describe('resolveOutputFile', () => {
  // Should append format extension when output extension doesn't match format
  it('should append format extension when output extension does not match format', () => {
    const result = resolveOutputFile({ input: 'video.mp4', output: 'output.avi', format: 'mov', suffix: '_converted' });

    expect(result).toBe('output.avi.mov');
  });

  // Should not append format extension when output extension matches format
  it('should not append format extension when output extension matches format', () => {
    const result = resolveOutputFile({ input: 'video.mp4', output: 'output.avi', format: 'avi', suffix: '_converted' });

    expect(result).toBe('output.avi');
  });

  // Should return output as-is when no format is provided
  it('should return output as-is when no format is provided', () => {
    const result = resolveOutputFile({ input: 'video.mp4', output: 'output.avi', suffix: '_converted' });

    expect(result).toBe('output.avi');
  });

  // Should generate default filename when output is not provided
  it('should generate default filename when output is not provided', () => {
    const result = resolveOutputFile({ input: '/path/to/video.mp4', suffix: '_compressed' });

    expect(result).toBe('/path/to/video_compressed.mp4');
  });

  // Should use format extension when generating default filename
  it('should use format extension when generating default filename', () => {
    const result = resolveOutputFile({ input: '/path/to/video.avi', format: 'mov', suffix: '_converted' });

    expect(result).toBe('/path/to/video_converted.mov');
  });

  // Should preserve input extension when no format and no output
  it('should preserve input extension when no format and no output', () => {
    const result = resolveOutputFile({ input: '/path/to/video.mkv', suffix: '_compressed' });

    expect(result).toBe('/path/to/video_compressed.mkv');
  });

  // Should default to mp4 extension when input has no extension
  it('should default to mp4 extension when input has no extension', () => {
    const result = resolveOutputFile({ input: '/path/to/video', suffix: '_converted' });

    expect(result).toBe('/path/to/video_converted.mp4');
  });

  // Should handle complex suffix with timestamps
  it('should handle complex suffix with timestamps', () => {
    const result = resolveOutputFile({ input: '/path/to/video.mp4', suffix: '_0m_10s_1m_30s' });

    expect(result).toBe('/path/to/video_0m_10s_1m_30s.mp4');
  });

  // Should handle HEVC suffix for compact command
  it('should handle HEVC suffix for compact command', () => {
    const result = resolveOutputFile({ input: '/path/to/video.mp4', suffix: '_compact_hevc' });

    expect(result).toBe('/path/to/video_compact_hevc.mp4');
  });

  // Should handle speed rate suffix
  it('should handle speed rate suffix', () => {
    const result = resolveOutputFile({ input: '/path/to/video.mp4', suffix: '_2x' });

    expect(result).toBe('/path/to/video_2x.mp4');
  });

  // Should handle output without extension when format is provided
  it('should handle output without extension when format is provided', () => {
    const result = resolveOutputFile({ input: 'video.mp4', output: 'output', format: 'mov', suffix: '_converted' });

    expect(result).toBe('output.mov');
  });

  // Tests for getFileExtension
  describe('getFileExtension', () => {
    // Should extract file extension correctly
    it('should return correct extension', () => {
      // Expect getFileExtension extracts lowercase extension
      expect(getFileExtension('video.mp4')).toBe('mp4');

      // Expect getFileExtension converts to lowercase
      expect(getFileExtension('/path/to/video.MKV')).toBe('mkv');

      // Expect getFileExtension handles wav
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

      // Expect generateOutputFilename handles simple filename
      expect(generateOutputFilename('video.avi', 'mp4')).toBe('video.mp4');
    });

    // Should preserve directory path
    it('should preserve directory structure', () => {
      const result = generateOutputFilename('/home/user/videos/test.mov', 'mp4');

      // Expect full path is maintained with new extension
      expect(result).toBe('/home/user/videos/test.mp4');
    });
  });
});
