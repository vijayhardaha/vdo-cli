import { describe, it, expect } from 'vitest';

import { resolveOutputFile } from '@/utils/output';

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
});
