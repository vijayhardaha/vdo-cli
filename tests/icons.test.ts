import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('is-unicode-supported', () => ({ default: vi.fn() }));

// describe: icons utilities
describe('icons', () => {
  let originalIsUnicodeSupported: typeof import('is-unicode-supported').default;

  beforeEach(async () => {
    const isUnicodeSupported = await import('is-unicode-supported');
    originalIsUnicodeSupported = isUnicodeSupported.default;
  });

  afterEach(() => {
    vi.mocked(originalIsUnicodeSupported).mockRestore();
  });

  // describe: info icon
  describe('info', () => {
    // it: should use unicode symbol when supported
    it('should use unicode symbol when supported', async () => {
      const isUnicodeSupported = await import('is-unicode-supported');
      vi.mocked(isUnicodeSupported.default).mockReturnValue(true);

      // Re-import to get fresh module with mocked value
      vi.resetModules();
      const { info } = await import('../src/utils/icons.js');

      // expect: info contains unicode ℹ
      expect(info).toContain('ℹ');
    });

    // it: should use fallback symbol when unicode not supported
    it('should use fallback symbol when unicode not supported', async () => {
      const isUnicodeSupported = await import('is-unicode-supported');
      vi.mocked(isUnicodeSupported.default).mockReturnValue(false);

      // Re-import to get fresh module with mocked value
      vi.resetModules();
      const { info } = await import('../src/utils/icons.js');

      // expect: info contains fallback i
      expect(info).toContain('i');
    });
  });

  // describe: success icon
  describe('success', () => {
    // it: should use unicode symbol when supported
    it('should use unicode symbol when supported', async () => {
      const isUnicodeSupported = await import('is-unicode-supported');
      vi.mocked(isUnicodeSupported.default).mockReturnValue(true);

      vi.resetModules();
      const { success } = await import('../src/utils/icons.js');

      // expect: success contains unicode ✔
      expect(success).toContain('✔');
    });

    // it: should use fallback symbol when unicode not supported
    it('should use fallback symbol when unicode not supported', async () => {
      const isUnicodeSupported = await import('is-unicode-supported');
      vi.mocked(isUnicodeSupported.default).mockReturnValue(false);

      vi.resetModules();
      const { success } = await import('../src/utils/icons.js');

      // expect: success contains fallback √
      expect(success).toContain('√');
    });
  });

  // describe: warning icon
  describe('warning', () => {
    // it: should use unicode symbol when supported
    it('should use unicode symbol when supported', async () => {
      const isUnicodeSupported = await import('is-unicode-supported');
      vi.mocked(isUnicodeSupported.default).mockReturnValue(true);

      vi.resetModules();
      const { warning } = await import('../src/utils/icons.js');

      // expect: warning contains unicode ⚠
      expect(warning).toContain('⚠');
    });

    // it: should use fallback symbol when unicode not supported
    it('should use fallback symbol when unicode not supported', async () => {
      const isUnicodeSupported = await import('is-unicode-supported');
      vi.mocked(isUnicodeSupported.default).mockReturnValue(false);

      vi.resetModules();
      const { warning } = await import('../src/utils/icons.js');

      // expect: warning contains fallback ‼
      expect(warning).toContain('‼');
    });
  });

  // describe: error icon
  describe('error', () => {
    // it: should use unicode symbol when supported
    it('should use unicode symbol when supported', async () => {
      const isUnicodeSupported = await import('is-unicode-supported');
      vi.mocked(isUnicodeSupported.default).mockReturnValue(true);

      vi.resetModules();
      const { error } = await import('../src/utils/icons.js');

      // expect: error contains unicode ✖
      expect(error).toContain('✖');
    });

    // it: should use fallback symbol when unicode not supported
    it('should use fallback symbol when unicode not supported', async () => {
      const isUnicodeSupported = await import('is-unicode-supported');
      vi.mocked(isUnicodeSupported.default).mockReturnValue(false);

      vi.resetModules();
      const { error } = await import('../src/utils/icons.js');

      // expect: error contains fallback ×
      expect(error).toContain('×');
    });
  });

  // describe: loading icon
  describe('loading', () => {
    // it: should render loading icon
    it('should render loading icon', async () => {
      const { loading } = await import('../src/utils/icons.js');

      // expect: loading icon is defined
      expect(loading).toBeDefined();
    });
  });
});
