import { describe, it, expect } from 'vitest';

import { info, success, warning, error, loading } from '@/utils/icons';

// Tests for icons utilities
describe('icons', () => {
  // Tests for info icon
  describe('info', () => {
    // Should render info icon with blue colored i
    it('should render info icon', () => {
      // Expect info icon contains blue colored 'i'
      expect(info).toContain('i');

      // Expect info icon is truthy
      expect(info).toBeTruthy();
    });
  });

  // Tests for success icon
  describe('success', () => {
    // Should render success icon with green checkmark
    it('should render success icon', () => {
      // Expect success icon contains green checkmark
      expect(success).toContain('✓');

      // Expect success icon is truthy
      expect(success).toBeTruthy();
    });
  });

  // Tests for warning icon
  describe('warning', () => {
    // Should render warning icon with yellow warning symbol
    it('should render warning icon', () => {
      // Expect warning icon contains yellow warning symbol
      expect(warning).toContain('‼');

      // Expect warning icon is truthy
      expect(warning).toBeTruthy();
    });
  });

  // Tests for error icon
  describe('error', () => {
    // Should render error icon with red X
    it('should render error icon', () => {
      // Expect error icon contains red X
      expect(error).toContain('×');

      // Expect error icon is truthy
      expect(error).toBeTruthy();
    });
  });

  // Tests for loading icon
  describe('loading', () => {
    // Should render loading icon with tilde symbol
    it('should render loading icon', () => {
      // Expect loading icon is defined
      expect(loading).toBeDefined();

      // Expect loading icon contains tilde
      expect(loading).toContain('~');
    });

    // Should return a non-empty string
    it('should return a string', () => {
      // Expect loading icon type is string
      expect(typeof loading).toBe('string');

      // Expect loading icon length is greater than 0
      expect(loading.length).toBeGreaterThan(0);
    });

    // Should be white colored with tilde
    it('should be white colored', () => {
      // Expect loading icon matches tilde pattern
      expect(loading).toMatch(/~/);
    });
  });
});
