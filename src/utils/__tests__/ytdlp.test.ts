import { describe, it, expect, vi, beforeEach } from 'vitest';

import { downloadVideo, getVideoInfo, generateFilename } from '../ytdlp.js';

vi.mock('../dependencies.js', () => ({ runCommand: vi.fn() }));

vi.mock('../progress.js', () => ({ parseYtDlpProgress: vi.fn() }));

vi.mock('../sanitize.js', () => ({ sanitizeFilename: vi.fn((name) => name) }));

// Tests for ytdlp utilities
describe('ytdlp utils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Tests for downloadVideo
  describe('downloadVideo', () => {
    // Should build mp4 download command
    it('should build mp4 download command', async () => {
      const { runCommand } = await import('../dependencies.js');

      vi.mocked(runCommand).mockResolvedValue({ stdout: '', stderr: '' });

      await downloadVideo('https://example.com/video', 'output.mp4', 'mp4');

      const cmd = vi.mocked(runCommand).mock.calls[0]?.[0];

      // Expect command contains yt-dlp with correct output path
      expect(cmd).toContain('yt-dlp');

      // Expect output path is correct
      expect(cmd).toContain('--output "output.mp4"');
    });

    // Should build webm download command
    it('should build webm download command', async () => {
      const { runCommand } = await import('../dependencies.js');

      vi.mocked(runCommand).mockResolvedValue({ stdout: '', stderr: '' });

      await downloadVideo('https://example.com/video', 'output.webm', 'webm');

      const cmd = vi.mocked(runCommand).mock.calls[0]?.[0];

      // Expect command contains yt-dlp with webm format
      expect(cmd).toContain('yt-dlp');

      // Expect webm format is used
      expect(cmd).toContain('webm');
    });

    // Should build mp3 extract-audio command
    it('should build mp3 extract-audio command', async () => {
      const { runCommand } = await import('../dependencies.js');

      vi.mocked(runCommand).mockResolvedValue({ stdout: '', stderr: '' });

      await downloadVideo('https://example.com/video', 'output.mp3', 'mp3');

      const cmd = vi.mocked(runCommand).mock.calls[0]?.[0];

      // Expect command contains extract-audio flags
      expect(cmd).toContain('--extract-audio');

      // Expect audio format is mp3
      expect(cmd).toContain('--audio-format mp3');
    });

    // Should fall back to mp4 for unknown format
    it('should fall back to mp4 for unknown format', async () => {
      const { runCommand } = await import('../dependencies.js');

      vi.mocked(runCommand).mockResolvedValue({ stdout: '', stderr: '' });

      await downloadVideo('https://example.com/video', 'output.mp4', 'unknown');

      const cmd = vi.mocked(runCommand).mock.calls[0]?.[0];

      // Expect command uses yt-dlp
      expect(cmd).toContain('yt-dlp');
    });

    // Should call onProgress when download progress parsed
    it('should call onProgress when download progress parsed', async () => {
      const { runCommand } = await import('../dependencies.js');

      const { parseYtDlpProgress } = await import('../progress.js');

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

      // Expect onProgress is called with parsed values
      expect(onProgress).toHaveBeenCalledWith(50, 100, 'MiB');
    });

    // Should call onProgress when stderr data contains progress
    it('should call onProgress when stderr data contains progress', async () => {
      const { runCommand } = await import('../dependencies.js');

      const { parseYtDlpProgress } = await import('../progress.js');

      vi.mocked(runCommand).mockImplementation(async (_cmd, onOutput) => {
        if (onOutput) {
          onOutput('[download] 25.0% of 50.00MiB', 'stderr');
        }

        return { stdout: '', stderr: '' };
      });

      vi.mocked(parseYtDlpProgress).mockReturnValue({ type: 'download', percentage: 25, size: 50, unit: 'MiB' });

      const onProgress = vi.fn();

      await downloadVideo('https://example.com', 'out.mp4', 'mp4', onProgress);

      // Expect onProgress is called with parsed values
      expect(onProgress).toHaveBeenCalledWith(25, 50, 'MiB');
    });

    // Should not call onProgress when progress type is not download
    it('should not call onProgress when progress type is not download', async () => {
      const { runCommand } = await import('../dependencies.js');

      const { parseYtDlpProgress } = await import('../progress.js');

      vi.mocked(runCommand).mockImplementation(async (_cmd, onOutput) => {
        if (onOutput) onOutput('[download] Destination: file.mp4', 'stdout');

        return { stdout: '', stderr: '' };
      });

      vi.mocked(parseYtDlpProgress).mockReturnValue({ type: 'destination', filename: 'file.mp4' });

      const onProgress = vi.fn();

      await downloadVideo('https://example.com', 'out.mp4', 'mp4', onProgress);

      // Expect onProgress is not called for non-download types
      expect(onProgress).not.toHaveBeenCalled();
    });

    // Should not call onProgress when parseYtDlpProgress returns null
    it('should not call onProgress when parseYtDlpProgress returns null', async () => {
      const { runCommand } = await import('../dependencies.js');

      const { parseYtDlpProgress } = await import('../progress.js');

      vi.mocked(runCommand).mockImplementation(async (_cmd, onOutput) => {
        if (onOutput) onOutput('some other line', 'stdout');

        return { stdout: '', stderr: '' };
      });

      vi.mocked(parseYtDlpProgress).mockReturnValue(null);

      const onProgress = vi.fn();

      await downloadVideo('https://example.com', 'out.mp4', 'mp4', onProgress);

      // Expect onProgress is not called when parsing returns null
      expect(onProgress).not.toHaveBeenCalled();
    });

    // Should use default values for undefined percentage, size, or unit
    it('should use default values for undefined percentage, size, or unit', async () => {
      const { runCommand } = await import('../dependencies.js');

      const { parseYtDlpProgress } = await import('../progress.js');

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

      // Expect onProgress uses default values
      expect(onProgress).toHaveBeenCalledWith(0, 0, 'MiB');
    });

    // Should use default format mp4 when not specified
    it('should use default format mp4 when not specified', async () => {
      const { runCommand } = await import('../dependencies.js');

      vi.mocked(runCommand).mockResolvedValue({ stdout: '', stderr: '' });

      await downloadVideo('https://example.com/video', 'output.mp4');

      const cmd = vi.mocked(runCommand).mock.calls[0]?.[0];

      // Expect command uses yt-dlp
      expect(cmd).toContain('yt-dlp');
    });

    // Should work with null onProgress callback
    it('should work with null onProgress callback', async () => {
      const { runCommand } = await import('../dependencies.js');

      const { parseYtDlpProgress } = await import('../progress.js');

      vi.mocked(runCommand).mockImplementation(async (_cmd, onOutput) => {
        if (onOutput) onOutput('[download] 50.0% of 100MiB', 'stdout');

        return { stdout: '', stderr: '' };
      });

      vi.mocked(parseYtDlpProgress).mockReturnValue({ type: 'download', percentage: 50, size: 100, unit: 'MiB' });

      // Expect download completes without error with null callback
      await expect(downloadVideo('https://example.com', 'out.mp4', 'mp4', null)).resolves.toBeUndefined();
    });
  });

  // Tests for getVideoInfo
  describe('getVideoInfo', () => {
    // Should return title, video_id, and ext from yt-dlp
    it('should return title, video_id, and ext from yt-dlp', async () => {
      const { runCommand } = await import('../dependencies.js');

      const videoData = { title: 'Test Video', id: 'abc123', display_id: 'abc123', ext: 'mp4' };

      vi.mocked(runCommand).mockResolvedValue({ stdout: JSON.stringify(videoData), stderr: '' });

      const result = await getVideoInfo('https://example.com');

      // Expect result contains correct values
      expect(result).toEqual({ title: 'Test Video', video_id: 'abc123', ext: 'mp4' });
    });

    // Should use display_id when available
    it('should use display_id when available', async () => {
      const { runCommand } = await import('../dependencies.js');

      const videoData = { title: 'Test', id: 'id123', display_id: 'display456', ext: 'webm' };

      vi.mocked(runCommand).mockResolvedValue({ stdout: JSON.stringify(videoData), stderr: '' });

      const result = await getVideoInfo('https://example.com');

      // Expect video_id uses display_id
      expect(result.video_id).toBe('display456');
    });

    // Should use id when display_id not available
    it('should use id when display_id not available', async () => {
      const { runCommand } = await import('../dependencies.js');

      const videoData = { title: 'Test', id: 'id123', ext: 'mkv' };

      vi.mocked(runCommand).mockResolvedValue({ stdout: JSON.stringify(videoData), stderr: '' });

      const result = await getVideoInfo('https://example.com');

      // Expect video_id uses id
      expect(result.video_id).toBe('id123');
    });

    // Should use unknown when both display_id and id are missing
    it('should use unknown when both display_id and id are missing', async () => {
      const { runCommand } = await import('../dependencies.js');

      const videoData = { title: 'Test', ext: 'mp4' };

      vi.mocked(runCommand).mockResolvedValue({ stdout: JSON.stringify(videoData), stderr: '' });

      const result = await getVideoInfo('https://example.com');

      // Expect video_id defaults to 'unknown'
      expect(result.video_id).toBe('unknown');
    });

    // Should use untitled when title is missing
    it('should use untitled when title is missing', async () => {
      const { runCommand } = await import('../dependencies.js');

      const { sanitizeFilename } = await import('../sanitize.js');

      vi.mocked(sanitizeFilename).mockReturnValue('untitled');

      const videoData = { id: 'abc123', ext: 'mp4' };

      vi.mocked(runCommand).mockResolvedValue({ stdout: JSON.stringify(videoData), stderr: '' });

      await getVideoInfo('https://example.com');

      // Expect sanitizeFilename is called with 'untitled'
      expect(sanitizeFilename).toHaveBeenCalledWith('untitled');
    });

    // Should default to mp4 when ext not provided
    it('should default to mp4 when ext not provided', async () => {
      const { runCommand } = await import('../dependencies.js');

      const videoData = { title: 'Test', id: 'abc' };

      vi.mocked(runCommand).mockResolvedValue({ stdout: JSON.stringify(videoData), stderr: '' });

      const result = await getVideoInfo('https://example.com');

      // Expect ext defaults to mp4
      expect(result.ext).toBe('mp4');
    });

    // Should throw when JSON parsing fails
    it('should throw when JSON parsing fails', async () => {
      const { runCommand } = await import('../dependencies.js');

      vi.mocked(runCommand).mockResolvedValue({ stdout: 'invalid json', stderr: '' });

      // Expect error is thrown for invalid JSON
      await expect(getVideoInfo('https://example.com')).rejects.toThrow('Failed to parse video information');
    });
  });

  // Tests for generateFilename
  describe('generateFilename', () => {
    // Should generate filename with requested format for video
    it('should generate filename with requested format for video', () => {
      const videoInfo = { title: 'Test Video', video_id: 'abc123', ext: 'webm' };

      const result = generateFilename(videoInfo, 'mp4');

      // Expect filename uses requested format
      expect(result).toBe('Test Video_abc123.mp4');
    });

    // Should use mp3 extension for audio format
    it('should use mp3 extension for audio format', () => {
      const videoInfo = { title: 'Test Video', video_id: 'abc123', ext: 'webm' };

      const result = generateFilename(videoInfo, 'mp3');

      // Expect filename uses mp3 extension
      expect(result).toBe('Test Video_abc123.mp3');
    });
  });
});
