import { describe, it, expect, vi, beforeEach } from 'vitest';

import { downloadVideo, getVideoInfo, generateFilename } from '../src/utils/ytdlp.js';

vi.mock('../src/utils/dependencies.js', () => ({ runCommand: vi.fn() }));

vi.mock('../src/utils/progress.js', () => ({ parseYtDlpProgress: vi.fn() }));

vi.mock('../src/utils/sanitize.js', () => ({ sanitizeFilename: vi.fn((name) => name) }));

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

    it('should build webm download command', async () => {
      const { runCommand } = await import('../src/utils/dependencies.js');
      vi.mocked(runCommand).mockResolvedValue({ stdout: '', stderr: '' });

      await downloadVideo('https://example.com/video', 'output.webm', 'webm');

      const cmd = vi.mocked(runCommand).mock.calls[0]?.[0];
      expect(cmd).toContain('yt-dlp');
      expect(cmd).toContain('webm');
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

      vi.mocked(parseYtDlpProgress).mockReturnValue({ type: 'download', percentage: 50, size: 100, unit: 'MiB' });

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

      vi.mocked(parseYtDlpProgress).mockReturnValue({ type: 'destination', filename: 'file.mp4' });

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

    it('should use default values for undefined percentage, size, or unit', async () => {
      const { runCommand } = await import('../src/utils/dependencies.js');
      const { parseYtDlpProgress } = await import('../src/utils/progress.js');

      vi.mocked(runCommand).mockImplementation(async (_cmd, onOutput) => {
        if (onOutput) onOutput('[download] data', 'stdout');
        return { stdout: '', stderr: '' };
      });

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

      vi.mocked(parseYtDlpProgress).mockReturnValue({ type: 'download', percentage: 50, size: 100, unit: 'MiB' });

      await expect(downloadVideo('https://example.com', 'out.mp4', 'mp4', null)).resolves.toBeUndefined();
    });
  });

  describe('getVideoInfo', () => {
    it('should return title, video_id, and ext from yt-dlp', async () => {
      const { runCommand } = await import('../src/utils/dependencies.js');
      const videoData = { title: 'Test Video', id: 'abc123', display_id: 'abc123', ext: 'mp4' };
      vi.mocked(runCommand).mockResolvedValue({ stdout: JSON.stringify(videoData), stderr: '' });

      const result = await getVideoInfo('https://example.com');
      expect(result).toEqual({ title: 'Test Video', video_id: 'abc123', ext: 'mp4' });
    });

    it('should use display_id when available', async () => {
      const { runCommand } = await import('../src/utils/dependencies.js');
      const videoData = { title: 'Test', id: 'id123', display_id: 'display456', ext: 'webm' };
      vi.mocked(runCommand).mockResolvedValue({ stdout: JSON.stringify(videoData), stderr: '' });

      const result = await getVideoInfo('https://example.com');
      expect(result.video_id).toBe('display456');
    });

    it('should use id when display_id not available', async () => {
      const { runCommand } = await import('../src/utils/dependencies.js');
      const videoData = { title: 'Test', id: 'id123', ext: 'mkv' };
      vi.mocked(runCommand).mockResolvedValue({ stdout: JSON.stringify(videoData), stderr: '' });

      const result = await getVideoInfo('https://example.com');
      expect(result.video_id).toBe('id123');
    });

    it('should default to mp4 when ext not provided', async () => {
      const { runCommand } = await import('../src/utils/dependencies.js');
      const videoData = { title: 'Test', id: 'abc' };
      vi.mocked(runCommand).mockResolvedValue({ stdout: JSON.stringify(videoData), stderr: '' });

      const result = await getVideoInfo('https://example.com');
      expect(result.ext).toBe('mp4');
    });

    it('should throw when JSON parsing fails', async () => {
      const { runCommand } = await import('../src/utils/dependencies.js');
      vi.mocked(runCommand).mockResolvedValue({ stdout: 'invalid json', stderr: '' });

      await expect(getVideoInfo('https://example.com')).rejects.toThrow('Failed to parse video information');
    });
  });

  describe('generateFilename', () => {
    it('should generate filename with requested format for video', () => {
      const videoInfo = { title: 'Test Video', video_id: 'abc123', ext: 'webm' };
      const result = generateFilename(videoInfo, 'mp4');
      expect(result).toBe('Test Video_abc123.mp4');
    });

    it('should use mp3 extension for audio format', () => {
      const videoInfo = { title: 'Test Video', video_id: 'abc123', ext: 'webm' };
      const result = generateFilename(videoInfo, 'mp3');
      expect(result).toBe('Test Video_abc123.mp3');
    });
  });
});
