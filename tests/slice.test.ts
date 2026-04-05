import { describe, it, expect } from 'vitest';

import { formatTimeForFFmpeg } from '../src/utils/slice.js';

// describe: slice utilities
describe('slice utils', () => {
  // describe: formatTimeForFFmpeg
  describe('formatTimeForFFmpeg', () => {
    // it: should handle HH:MM:SS format
    it('should handle HH:MM:SS format', () => {
      expect(formatTimeForFFmpeg('00:01:30')).toBe('00:01:30');
    });

    // it: should handle M:SS format
    it('should handle M:SS format', () => {
      expect(formatTimeForFFmpeg('1:30')).toBe('00:01:30');
    });

    // it: should handle plain seconds
    it('should handle plain seconds', () => {
      const result = formatTimeForFFmpeg('90');
      expect(result).toBe('00:01:30');
    });

    // it: should handle 0 seconds
    it('should handle 0 seconds', () => {
      const result = formatTimeForFFmpeg('0');
      expect(result).toBe('00:00:00');
    });

    // it: should handle large hours
    it('should handle large hours', () => {
      const result = formatTimeForFFmpeg('3661');
      expect(result).toBe('01:01:01');
    });
  });
});
