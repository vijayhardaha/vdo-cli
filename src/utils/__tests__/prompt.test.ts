import { describe, it, expect, vi, beforeEach } from 'vitest';

import { checkAndPromptOverwrite } from '@/utils/prompt';

vi.mock('../log', () => ({ log: { info: vi.fn() } }));

vi.mock('fs/promises', () => ({ access: vi.fn() }));

// Mock readline
const mockQuestion = vi.fn();
const mockClose = vi.fn();

vi.mock('node:readline', () => ({ createInterface: vi.fn(() => ({ question: mockQuestion, close: mockClose })) }));

// Tests for prompt utilities
describe('prompt utils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockQuestion.mockImplementation((_query: string, callback: (answer: string) => void) => {
      // default: simulate empty response after a tick
      setTimeout(() => callback(''), 0);
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

      mockQuestion.mockImplementation((_query: string, callback: (answer: string) => void) => {
        setTimeout(() => callback('y'), 0);
      });

      const result = await checkAndPromptOverwrite(['existing.mp4']);

      expect(result).toBe(true);
    });

    // Should return false when user declines overwrite
    it('should return false when user declines overwrite', async () => {
      const fs = await import('fs/promises');
      vi.mocked(fs.access).mockResolvedValue(undefined);

      mockQuestion.mockImplementation((_query: string, callback: (answer: string) => void) => {
        setTimeout(() => callback('n'), 0);
      });

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

      mockQuestion.mockImplementation((_query: string, callback: (answer: string) => void) => {
        setTimeout(() => callback('y'), 0);
      });

      const result = await checkAndPromptOverwrite(['file1.mp4', 'file2.mp4', 'file3.mp4']);

      expect(result).toBe(true);
    });
  });
});
