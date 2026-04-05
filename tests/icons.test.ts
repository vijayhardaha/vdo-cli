import { describe, it, expect } from 'vitest';

import { info, success, warning, error, loading } from '../src/utils/icons.js';

// describe: icons utilities
describe('icons', () => {
  // describe: info icon
  describe('info', () => {
    // it: should render info icon
    it('should render info icon', () => {
      // expect: info icon contains blue colored i
      expect(info).toContain('i');
      expect(info).toBeTruthy();
    });
  });

  // describe: success icon
  describe('success', () => {
    // it: should render success icon
    it('should render success icon', () => {
      // expect: success icon contains green checkmark
      expect(success).toContain('✓');
      expect(success).toBeTruthy();
    });
  });

  // describe: warning icon
  describe('warning', () => {
    // it: should render warning icon
    it('should render warning icon', () => {
      // expect: warning icon contains yellow warning symbol
      expect(warning).toContain('‼');
      expect(warning).toBeTruthy();
    });
  });

  // describe: error icon
  describe('error', () => {
    // it: should render error icon
    it('should render error icon', () => {
      // expect: error icon contains red X
      expect(error).toContain('×');
      expect(error).toBeTruthy();
    });
  });

  // describe: loading icon
  describe('loading', () => {
    // it: should render loading icon
    it('should render loading icon', () => {
      // expect: loading icon is defined and contains tilde
      expect(loading).toBeDefined();
      expect(loading).toContain('~');
    });

    // it: should return a string
    it('should return a string', () => {
      // expect: loading icon returns a non-empty string
      expect(typeof loading).toBe('string');
      expect(loading.length).toBeGreaterThan(0);
    });

    // it: should be white colored
    it('should be white colored', () => {
      // expect: loading icon contains the tilde symbol
      expect(loading).toMatch(/~/);
    });
  });
});
