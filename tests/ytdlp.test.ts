import { describe, it, expect, vi, beforeEach } from 'vitest';
import { downloadVideo, getVideoInfo, isSupportedURL } from '../src/utils/ytdlp.js';

vi.mock('../src/utils/dependencies.js', () => ({
  runCommand: vi.fn(),
}));

vi.mock('../src/utils/progress.js', () => ({
  parseYtDlpProgress: vi.fn(),
}));

// Test suite for yt-dlp utility functions
describe('ytdlp utils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Tests for downloadVideo function
  describe('downloadVideo', () => {
    // Should build mp4 download command
    it('should build mp4 download command', async () => {
      const { runCommand } = await import('../src/utils/dependencies.js');
      vi.mocked(runCommand).mockResolvedValue({ stdout: '', stderr: '' });

      await downloadVideo('https://example.com/video', 'output.mp4', 'mp4');

      const cmd = vi.mocked(runCommand).mock.calls[0]?.[0];
      expect(cmd).toContain('yt-dlp');
      expect(cmd).toContain('--output "output.mp4"');
    });

    // Should build mkv download command
    it('should build mkv download command', async () => {
      const { runCommand } = await import('../src/utils/dependencies.js');
      vi.mocked(runCommand).mockResolvedValue({ stdout: '', stderr: '' });

      await downloadVideo('https://example.com/video', 'output.mkv', 'mkv');

      const cmd = vi.mocked(runCommand).mock.calls[0]?.[0];
      expect(cmd).toContain('yt-dlp');
      expect(cmd).toContain('mkv');
    });

    // Should build mp3 extract-audio command
    it('should build mp3 extract-audio command', async () => {
      const { runCommand } = await import('../src/utils/dependencies.js');
      vi.mocked(runCommand).mockResolvedValue({ stdout: '', stderr: '' });

      await downloadVideo('https://example.com/video', 'output.mp3', 'mp3');

      const cmd = vi.mocked(runCommand).mock.calls[0]?.[0];
      expect(cmd).toContain('--extract-audio');
      expect(cmd).toContain('--audio-format mp3');
    });

    // Should fall back to mp4 for unknown format
    it('should fall back to mp4 for unknown format', async () => {
      const { runCommand } = await import('../src/utils/dependencies.js');
      vi.mocked(runCommand).mockResolvedValue({ stdout: '', stderr: '' });

      await downloadVideo('https://example.com/video', 'output.mp4', 'unknown');

      const cmd = vi.mocked(runCommand).mock.calls[0]?.[0];
      expect(cmd).toContain('yt-dlp');
    });

    // Should call onProgress when download progress parsed
    it('should call onProgress when download progress parsed', async () => {
      const { runCommand } = await import('../src/utils/dependencies.js');
      const { parseYtDlpProgress } = await import('../src/utils/progress.js');

      vi.mocked(runCommand).mockImplementation(async (_cmd, onOutput) => {
        if (onOutput) {
          onOutput('[download] 50.0% of 100.00MiB', 'stdout');
          onOutput('[download] 75.0% of 100.00MiB', 'stderr');
        }
        return { stdout: '', stderr: '' };
      });

      vi.mocked(parseYtDlpProgress).mockReturnValue({
        type: 'download',
        percentage: 50,
        size: 100,
        unit: 'MiB',
      });

      const onProgress = vi.fn();
      await downloadVideo('https://example.com', 'out.mp4', 'mp4', onProgress);
      expect(onProgress).toHaveBeenCalledWith(50, 100, 'MiB');
    });

    // Should not call onProgress when progress type is not download
    it('should not call onProgress when progress type is not download', async () => {
      const { runCommand } = await import('../src/utils/dependencies.js');
      const { parseYtDlpProgress } = await import('../src/utils/progress.js');

      vi.mocked(runCommand).mockImplementation(async (_cmd, onOutput) => {
        if (onOutput) onOutput('[download] Destination: file.mp4', 'stdout');
        return { stdout: '', stderr: '' };
      });

      vi.mocked(parseYtDlpProgress).mockReturnValue({
        type: 'destination',
        filename: 'file.mp4',
      });

      const onProgress = vi.fn();
      await downloadVideo('https://example.com', 'out.mp4', 'mp4', onProgress);
      expect(onProgress).not.toHaveBeenCalled();
    });

    // Should not call onProgress when parseYtDlpProgress returns null
    it('should not call onProgress when parseYtDlpProgress returns null', async () => {
      const { runCommand } = await import('../src/utils/dependencies.js');
      const { parseYtDlpProgress } = await import('../src/utils/progress.js');

      vi.mocked(runCommand).mockImplementation(async (_cmd, onOutput) => {
        if (onOutput) onOutput('some other line', 'stdout');
        return { stdout: '', stderr: '' };
      });

      vi.mocked(parseYtDlpProgress).mockReturnValue(null);
      const onProgress = vi.fn();
      await downloadVideo('https://example.com', 'out.mp4', 'mp4', onProgress);
      expect(onProgress).not.toHaveBeenCalled();
    });

    it('should use default values for undefined percentage, size, or unit', async () => {
      const { runCommand } = await import('../src/utils/dependencies.js');
      const { parseYtDlpProgress } = await import('../src/utils/progress.js');

      vi.mocked(runCommand).mockImplementation(async (_cmd, onOutput) => {
        if (onOutput) onOutput('[download] data', 'stdout');
        return { stdout: '', stderr: '' };
      });

      // Return progress with undefined fields to hit || fallbacks
      vi.mocked(parseYtDlpProgress).mockReturnValue({
        type: 'download',
        percentage: undefined,
        size: undefined,
        unit: undefined,
      });

      const onProgress = vi.fn();
      await downloadVideo('https://example.com', 'out.mp4', 'mp4', onProgress);
      expect(onProgress).toHaveBeenCalledWith(0, 0, 'MiB');
    });

    // Should use default format mp4 when not specified
    it('should use default format mp4 when not specified', async () => {
      const { runCommand } = await import('../src/utils/dependencies.js');
      vi.mocked(runCommand).mockResolvedValue({ stdout: '', stderr: '' });

      await downloadVideo('https://example.com/video', 'output.mp4');

      const cmd = vi.mocked(runCommand).mock.calls[0]?.[0];
      expect(cmd).toContain('yt-dlp');
    });

    // Should work with null onProgress callback
    it('should work with null onProgress callback', async () => {
      const { runCommand } = await import('../src/utils/dependencies.js');
      const { parseYtDlpProgress } = await import('../src/utils/progress.js');

      vi.mocked(runCommand).mockImplementation(async (_cmd, onOutput) => {
        if (onOutput) onOutput('[download] 50.0% of 100MiB', 'stdout');
        return { stdout: '', stderr: '' };
      });

      vi.mocked(parseYtDlpProgress).mockReturnValue({
        type: 'download',
        percentage: 50,
        size: 100,
        unit: 'MiB',
      });

      // null onProgress — should not throw
      await expect(
        downloadVideo('https://example.com', 'out.mp4', 'mp4', null)
      ).resolves.toBeUndefined();
    });
  });

  // Tests for getVideoInfo function
  describe('getVideoInfo', () => {
    // Should return parsed JSON from yt-dlp
    it('should return parsed JSON from yt-dlp', async () => {
      const { runCommand } = await import('../src/utils/dependencies.js');
      const videoData = { title: 'Test Video', duration: 120 };
      vi.mocked(runCommand).mockResolvedValue({
        stdout: JSON.stringify(videoData),
        stderr: '',
      });

      const result = await getVideoInfo('https://example.com');
      expect(result).toEqual(videoData);
    });

    // Should throw when JSON parsing fails
    it('should throw when JSON parsing fails', async () => {
      const { runCommand } = await import('../src/utils/dependencies.js');
      vi.mocked(runCommand).mockResolvedValue({ stdout: 'invalid json', stderr: '' });

      await expect(getVideoInfo('https://example.com')).rejects.toThrow(
        'Failed to parse video information'
      );
    });
  });

  // Tests for isSupportedURL function
  describe('isSupportedURL', () => {
    // Should return true for http:// URLs when yt-dlp runs ok
    it('should return true for http:// URLs when yt-dlp runs ok', async () => {
      const { runCommand } = await import('../src/utils/dependencies.js');
      vi.mocked(runCommand).mockResolvedValue({ stdout: 'extractors...', stderr: '' });

      const result = await isSupportedURL('http://example.com');
      expect(result).toBe(true);
    });

    // Should return true for https:// URLs when yt-dlp runs ok
    it('should return true for https:// URLs when yt-dlp runs ok', async () => {
      const { runCommand } = await import('../src/utils/dependencies.js');
      vi.mocked(runCommand).mockResolvedValue({ stdout: 'extractors...', stderr: '' });

      const result = await isSupportedURL('https://youtube.com');
      expect(result).toBe(true);
    });

    // Should return false for non-http URLs even when yt-dlp runs ok
    it('should return false for non-http URLs even when yt-dlp runs ok', async () => {
      const { runCommand } = await import('../src/utils/dependencies.js');
      vi.mocked(runCommand).mockResolvedValue({ stdout: 'extractors...', stderr: '' });

      const result = await isSupportedURL('ftp://example.com');
      expect(result).toBe(false);
    });

    // Should return false when runCommand throws
    it('should return false when runCommand throws', async () => {
      const { runCommand } = await import('../src/utils/dependencies.js');
      vi.mocked(runCommand).mockRejectedValue(new Error('yt-dlp not found'));

      const result = await isSupportedURL('https://example.com');
      expect(result).toBe(false);
    });
  });
});
