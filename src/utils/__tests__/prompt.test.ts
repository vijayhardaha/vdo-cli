import { describe, it, expect, vi, beforeEach } from 'vitest';

import { promptOverwrite, checkAndPromptOverwrite } from '../prompt.js';

vi.mock('../log.js', () => ({ log: { info: vi.fn() } }));

vi.mock('fs/promises', () => ({ access: vi.fn() }));

// Tests for prompt utilities
describe('prompt utils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Tests for promptOverwrite
  describe('promptOverwrite', () => {
    // Should return true for empty response (default yes)
    it('should return true for empty response', async () => {
      const onMock = vi.fn().mockImplementation((event: string, handler: (data: Buffer) => void) => {
        if (event === 'data') {
          setTimeout(() => handler(Buffer.from('\n')), 0);
        }
        return process.stdin as unknown as typeof process.stdin.on;
      });
      vi.spyOn(process.stdin, 'on').mockImplementation(onMock);
      vi.spyOn(process.stdout, 'write').mockImplementation(() => true);

      const result = await promptOverwrite('Overwrite?');

      expect(result).toBe(true);
    });

    // Should return true for 'y' response
    it('should return true for y response', async () => {
      const onMock = vi.fn().mockImplementation((event: string, handler: (data: Buffer) => void) => {
        if (event === 'data') {
          setTimeout(() => handler(Buffer.from('y\n')), 0);
        }
        return process.stdin as unknown as typeof process.stdin.on;
      });
      vi.spyOn(process.stdin, 'on').mockImplementation(onMock);
      vi.spyOn(process.stdout, 'write').mockImplementation(() => true);

      const result = await promptOverwrite('Overwrite?');

      expect(result).toBe(true);
    });

    // Should return true for 'yes' response
    it('should return true for yes response', async () => {
      const onMock = vi.fn().mockImplementation((event: string, handler: (data: Buffer) => void) => {
        if (event === 'data') {
          setTimeout(() => handler(Buffer.from('yes\n')), 0);
        }
        return process.stdin as unknown as typeof process.stdin.on;
      });
      vi.spyOn(process.stdin, 'on').mockImplementation(onMock);
      vi.spyOn(process.stdout, 'write').mockImplementation(() => true);

      const result = await promptOverwrite('Overwrite?');

      expect(result).toBe(true);
    });

    // Should return false for 'n' response
    it('should return false for n response', async () => {
      const onMock = vi.fn().mockImplementation((event: string, handler: (data: Buffer) => void) => {
        if (event === 'data') {
          setTimeout(() => handler(Buffer.from('n\n')), 0);
        }
        return process.stdin as unknown as typeof process.stdin.on;
      });
      vi.spyOn(process.stdin, 'on').mockImplementation(onMock);
      vi.spyOn(process.stdout, 'write').mockImplementation(() => true);

      const result = await promptOverwrite('Overwrite?');

      expect(result).toBe(false);
    });

    // Should handle uppercase responses
    it('should handle uppercase responses', async () => {
      const onMock = vi.fn().mockImplementation((event: string, handler: (data: Buffer) => void) => {
        if (event === 'data') {
          setTimeout(() => handler(Buffer.from('Y\n')), 0);
        }
        return process.stdin as unknown as typeof process.stdin.on;
      });
      vi.spyOn(process.stdin, 'on').mockImplementation(onMock);
      vi.spyOn(process.stdout, 'write').mockImplementation(() => true);

      const result = await promptOverwrite('Overwrite?');

      expect(result).toBe(true);
    });
  });

  // Tests for checkAndPromptOverwrite
  describe('checkAndPromptOverwrite', () => {
    // Should return true when no files exist
    it('should return true when no files exist', async () => {
      const fs = await import('fs/promises');

      vi.mocked(fs.access).mockRejectedValue(new Error('ENOENT'));

      const result = await checkAndPromptOverwrite(['output.mp4']);

      expect(result).toBe(true);
    });

    // Should return true when user confirms overwrite
    it('should return true when user confirms overwrite', async () => {
      const fs = await import('fs/promises');

      vi.mocked(fs.access).mockResolvedValue(undefined);

      const onMock = vi.fn().mockImplementation((event: string, handler: (data: Buffer) => void) => {
        if (event === 'data') {
          setTimeout(() => handler(Buffer.from('y\n')), 0);
        }
        return process.stdin as unknown as typeof process.stdin.on;
      });
      vi.spyOn(process.stdin, 'on').mockImplementation(onMock);
      vi.spyOn(process.stdout, 'write').mockImplementation(() => true);

      const result = await checkAndPromptOverwrite(['existing.mp4']);

      expect(result).toBe(true);
    });

    // Should return false when user declines overwrite
    it('should return false when user declines overwrite', async () => {
      const fs = await import('fs/promises');

      vi.mocked(fs.access).mockResolvedValue(undefined);

      const onMock = vi.fn().mockImplementation((event: string, handler: (data: Buffer) => void) => {
        if (event === 'data') {
          setTimeout(() => handler(Buffer.from('n\n')), 0);
        }
        return process.stdin as unknown as typeof process.stdin.on;
      });
      vi.spyOn(process.stdin, 'on').mockImplementation(onMock);
      vi.spyOn(process.stdout, 'write').mockImplementation(() => true);

      const result = await checkAndPromptOverwrite(['existing.mp4']);

      expect(result).toBe(false);
    });

    // Should handle multiple files
    it('should handle multiple files', async () => {
      const fs = await import('fs/promises');

      vi.mocked(fs.access)
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce(undefined)
        .mockRejectedValue(new Error('ENOENT'));

      const onMock = vi.fn().mockImplementation((event: string, handler: (data: Buffer) => void) => {
        if (event === 'data') {
          setTimeout(() => handler(Buffer.from('y\n')), 0);
        }
        return process.stdin as unknown as typeof process.stdin.on;
      });
      vi.spyOn(process.stdin, 'on').mockImplementation(onMock);
      vi.spyOn(process.stdout, 'write').mockImplementation(() => true);

      const result = await checkAndPromptOverwrite(['file1.mp4', 'file2.mp4', 'file3.mp4']);

      expect(result).toBe(true);
    });
  });
});
