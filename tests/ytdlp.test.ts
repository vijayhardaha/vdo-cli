import { describe, it, expect, vi, beforeEach } from 'vitest';
import { downloadVideo, getVideoInfo, isSupportedURL } from '../src/utils/ytdlp.js';

vi.mock('../src/utils/dependencies.js', () => ({
  runCommand: vi.fn(),
}));

vi.mock('../src/utils/progress.js', () => ({
  parseYtDlpProgress: vi.fn(),
}));

describe('ytdlp utils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('downloadVideo', () => {
    it('should build mp4 download command', async () => {
      const { runCommand } = await import('../src/utils/dependencies.js');
      vi.mocked(runCommand).mockResolvedValue({ stdout: '', stderr: '' });

      await downloadVideo('https://example.com/video', 'output.mp4', 'mp4');

      const cmd = vi.mocked(runCommand).mock.calls[0]?.[0];
      expect(cmd).toContain('yt-dlp');
      expect(cmd).toContain('--output "output.mp4"');
    });

    it('should build mkv download command', async () => {
      const { runCommand } = await import('../src/utils/dependencies.js');
      vi.mocked(runCommand).mockResolvedValue({ stdout: '', stderr: '' });

      await downloadVideo('https://example.com/video', 'output.mkv', 'mkv');

      const cmd = vi.mocked(runCommand).mock.calls[0]?.[0];
      expect(cmd).toContain('yt-dlp');
      expect(cmd).toContain('mkv');
    });

    it('should build mp3 extract-audio command', async () => {
      const { runCommand } = await import('../src/utils/dependencies.js');
      vi.mocked(runCommand).mockResolvedValue({ stdout: '', stderr: '' });

      await downloadVideo('https://example.com/video', 'output.mp3', 'mp3');

      const cmd = vi.mocked(runCommand).mock.calls[0]?.[0];
      expect(cmd).toContain('--extract-audio');
      expect(cmd).toContain('--audio-format mp3');
    });

    it('should fall back to mp4 for unknown format', async () => {
      const { runCommand } = await import('../src/utils/dependencies.js');
      vi.mocked(runCommand).mockResolvedValue({ stdout: '', stderr: '' });

      await downloadVideo('https://example.com/video', 'output.mp4', 'unknown');

      const cmd = vi.mocked(runCommand).mock.calls[0]?.[0];
      expect(cmd).toContain('yt-dlp');
    });

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

    it('should use default format mp4 when not specified', async () => {
      const { runCommand } = await import('../src/utils/dependencies.js');
      vi.mocked(runCommand).mockResolvedValue({ stdout: '', stderr: '' });

      await downloadVideo('https://example.com/video', 'output.mp4');

      const cmd = vi.mocked(runCommand).mock.calls[0]?.[0];
      expect(cmd).toContain('yt-dlp');
    });

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

  describe('getVideoInfo', () => {
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

    it('should throw when JSON parsing fails', async () => {
      const { runCommand } = await import('../src/utils/dependencies.js');
      vi.mocked(runCommand).mockResolvedValue({ stdout: 'invalid json', stderr: '' });

      await expect(getVideoInfo('https://example.com')).rejects.toThrow(
        'Failed to parse video information'
      );
    });
  });

  describe('isSupportedURL', () => {
    it('should return true for http:// URLs when yt-dlp runs ok', async () => {
      const { runCommand } = await import('../src/utils/dependencies.js');
      vi.mocked(runCommand).mockResolvedValue({ stdout: 'extractors...', stderr: '' });

      const result = await isSupportedURL('http://example.com');
      expect(result).toBe(true);
    });

    it('should return true for https:// URLs when yt-dlp runs ok', async () => {
      const { runCommand } = await import('../src/utils/dependencies.js');
      vi.mocked(runCommand).mockResolvedValue({ stdout: 'extractors...', stderr: '' });

      const result = await isSupportedURL('https://youtube.com');
      expect(result).toBe(true);
    });

    it('should return false for non-http URLs even when yt-dlp runs ok', async () => {
      const { runCommand } = await import('../src/utils/dependencies.js');
      vi.mocked(runCommand).mockResolvedValue({ stdout: 'extractors...', stderr: '' });

      const result = await isSupportedURL('ftp://example.com');
      expect(result).toBe(false);
    });

    it('should return false when runCommand throws', async () => {
      const { runCommand } = await import('../src/utils/dependencies.js');
      vi.mocked(runCommand).mockRejectedValue(new Error('yt-dlp not found'));

      const result = await isSupportedURL('https://example.com');
      expect(result).toBe(false);
    });
  });
});
