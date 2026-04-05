import { Command } from 'commander';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { setupDownload, downloadAction } from '../download.js';

vi.mock('../../utils/dependencies.js', () => ({ checkDependencies: vi.fn(), runCommand: vi.fn() }));

vi.mock('../../utils/ytdlp.js', () => ({
  downloadVideo: vi.fn(),
  getVideoInfo: vi.fn(),
  generateFilename: vi.fn((info, format) => `${info.title}_${info.video_id}.${format}`),
}));

vi.mock('../../utils/progress.js', () => ({
  createProgressBar: vi.fn(),
  formatFileSize: vi.fn(() => ({ value: 100, unit: 'MB' })),
}));

vi.mock('../../utils/validations.js', () => ({ validateUrl: vi.fn(), validateFormat: vi.fn() }));

vi.mock('../../utils/prompt.js', () => ({
  checkAndPromptOverwrite: vi.fn().mockResolvedValue(true),
  promptOverwrite: vi.fn().mockResolvedValue(true),
}));

vi.mock('../../utils/ffmpeg.js', () => ({ convertVideo: vi.fn() }));

vi.mock('../../utils/split.js', () => ({ parseSplitValue: vi.fn() }));

vi.mock('../split.js', () => ({ splitAction: vi.fn(), parseSplitValue: vi.fn() }));

vi.mock('fs/promises', () => ({
  access: vi.fn().mockRejectedValue(new Error('File not found')),
  rename: vi.fn(),
  unlink: vi.fn(),
}));

/* Mock progress bar */
const mockProgressBar = { start: vi.fn(), stop: vi.fn(), update: vi.fn() };

// Tests for download command
describe('download command', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Tests for setupDownload
  describe('setupDownload', () => {
    let program: Command;

    beforeEach(() => {
      program = new Command();
    });

    // Should register download command with correct options
    it('should register download command with correct options', () => {
      setupDownload(program);
      const commands = program.commands;

      expect(commands).toHaveLength(1);
      expect(commands[0]?.name()).toBe('download');
      expect(commands[0]?.aliases()).toContain('dl');
      expect(commands[0]?.options).toHaveLength(4);
    });

    // Should have output option
    it('should have output option', () => {
      setupDownload(program);
      const cmd = program.commands[0];
      const outputOption = cmd?.opts();

      expect(outputOption).toBeDefined();
    });

    // Should have format option
    it('should have format option', () => {
      setupDownload(program);
      const cmd = program.commands[0];
      const formatOption = cmd?.options.find((opt) => opt.long === '--format');

      expect(formatOption).toBeDefined();
    });

    // Should have convert option
    it('should have convert option', () => {
      setupDownload(program);
      const cmd = program.commands[0];
      const convertOption = cmd?.options.find((opt) => opt.long === '--convert');

      expect(convertOption).toBeDefined();
    });

    // Should have split option
    it('should have split option', () => {
      setupDownload(program);
      const cmd = program.commands[0];
      const splitOption = cmd?.options.find((opt) => opt.long === '--split');

      expect(splitOption).toBeDefined();
    });
  });

  // Tests for downloadAction
  describe('downloadAction', () => {
    // Should should exit with error when dependencies missing
    it('should exit with error when dependencies missing', async () => {
      const { checkDependencies } = await import('../../utils/dependencies.js');
      vi.mocked(checkDependencies).mockResolvedValue({ ok: false, missing: ['ffmpeg'] });
      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

      await downloadAction('https://example.com', {});

      // Expect process.exit is called with 1
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    // Should should exit with error when URL is invalid
    it('should exit with error when URL is invalid', async () => {
      const { checkDependencies } = await import('../../utils/dependencies.js');
      const { validateUrl } = await import('../../utils/validations.js');
      vi.mocked(checkDependencies).mockResolvedValue({ ok: true, missing: [] });
      vi.mocked(validateUrl).mockReturnValue(false);
      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

      await downloadAction('not-a-url', {});

      // Expect process.exit is called with 1
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    // Should should download video with default options
    it('should download video with default options', async () => {
      const { checkDependencies } = await import('../../utils/dependencies.js');
      const { validateUrl, validateFormat } = await import('../../utils/validations.js');
      const { downloadVideo, getVideoInfo } = await import('../../utils/ytdlp.js');
      const { createProgressBar } = await import('../../utils/progress.js');

      vi.mocked(checkDependencies).mockResolvedValue({ ok: true, missing: [] });
      vi.mocked(validateUrl).mockReturnValue(true);
      vi.mocked(validateFormat).mockReturnValue(undefined);
      vi.mocked(getVideoInfo).mockResolvedValue({ title: 'Test Video', video_id: 'abc123', ext: 'mp4' });
      vi.mocked(downloadVideo).mockResolvedValue(undefined);
      vi.mocked(createProgressBar).mockReturnValue(mockProgressBar as never);

      await downloadAction('https://example.com/video', {});

      // Expect downloadVideo is called
      expect(downloadVideo).toHaveBeenCalled();
    });

    // Should should use provided output and format options
    it('should use provided output and format options', async () => {
      const { checkDependencies } = await import('../../utils/dependencies.js');
      const { validateUrl, validateFormat } = await import('../../utils/validations.js');
      const { downloadVideo, getVideoInfo } = await import('../../utils/ytdlp.js');
      const { createProgressBar } = await import('../../utils/progress.js');

      vi.mocked(checkDependencies).mockResolvedValue({ ok: true, missing: [] });
      vi.mocked(validateUrl).mockReturnValue(true);
      vi.mocked(validateFormat).mockReturnValue(undefined);
      vi.mocked(getVideoInfo).mockResolvedValue({ title: 'Test', video_id: '123', ext: 'mp4' });
      vi.mocked(downloadVideo).mockResolvedValue(undefined);
      vi.mocked(createProgressBar).mockReturnValue(mockProgressBar as never);

      await downloadAction('https://example.com', { output: 'myvideo', format: 'mkv' });

      // Expect output uses requested format instead of videoInfo.ext
      const callArgs = vi.mocked(downloadVideo).mock.calls[0];
      expect(callArgs?.[1]).toBe('myvideo.mkv');
      expect(callArgs?.[2]).toBe('mkv');
    });

    // Should should append extension when output has no dot
    it('should append extension when output has no dot', async () => {
      const { checkDependencies } = await import('../../utils/dependencies.js');
      const { validateUrl, validateFormat } = await import('../../utils/validations.js');
      const { downloadVideo, getVideoInfo } = await import('../../utils/ytdlp.js');
      const { createProgressBar } = await import('../../utils/progress.js');

      vi.mocked(checkDependencies).mockResolvedValue({ ok: true, missing: [] });
      vi.mocked(validateUrl).mockReturnValue(true);
      vi.mocked(validateFormat).mockReturnValue(undefined);
      vi.mocked(getVideoInfo).mockResolvedValue({ title: 'Test', video_id: '123', ext: 'mp4' });
      vi.mocked(downloadVideo).mockResolvedValue(undefined);
      vi.mocked(createProgressBar).mockReturnValue(mockProgressBar as never);

      await downloadAction('https://example.com', { output: 'myvideo', format: 'mp3' });

      const callArgs = vi.mocked(downloadVideo).mock.calls[0];

      // Expect output appends format extension
      expect(callArgs?.[1]).toBe('myvideo.mp3');
    });

    // Should should call progressCallback and update progress bar
    it('should call progressCallback and update progress bar', async () => {
      const { checkDependencies } = await import('../../utils/dependencies.js');
      const { validateUrl, validateFormat } = await import('../../utils/validations.js');
      const { downloadVideo, getVideoInfo } = await import('../../utils/ytdlp.js');
      const { createProgressBar } = await import('../../utils/progress.js');

      vi.mocked(checkDependencies).mockResolvedValue({ ok: true, missing: [] });
      vi.mocked(validateUrl).mockReturnValue(true);
      vi.mocked(validateFormat).mockReturnValue(undefined);
      vi.mocked(getVideoInfo).mockResolvedValue({ title: 'Test', video_id: '123', ext: 'mp4' });

      vi.mocked(createProgressBar).mockReturnValue(mockProgressBar as never);
      vi.mocked(downloadVideo).mockImplementation(async (_url, _out, _fmt, onProgress) => {
        if (onProgress) onProgress(50, 100, 'MiB');
      });

      await downloadAction('https://example.com', {});

      // Expect progress bar is updated with percentage
      expect(mockProgressBar.update).toHaveBeenCalledWith(50, { total: 100 });
    });

    // Should should handle thrown errors and exit 1
    it('should handle thrown errors and exit 1', async () => {
      const { checkDependencies } = await import('../../utils/dependencies.js');
      const { validateUrl, validateFormat } = await import('../../utils/validations.js');
      const { downloadVideo, getVideoInfo } = await import('../../utils/ytdlp.js');
      const { createProgressBar } = await import('../../utils/progress.js');

      vi.mocked(checkDependencies).mockResolvedValue({ ok: true, missing: [] });
      vi.mocked(validateUrl).mockReturnValue(true);
      vi.mocked(validateFormat).mockReturnValue(undefined);
      vi.mocked(getVideoInfo).mockResolvedValue({ title: 'Test', video_id: '123', ext: 'mp4' });
      vi.mocked(createProgressBar).mockReturnValue(mockProgressBar as never);
      vi.mocked(downloadVideo).mockRejectedValue(new Error('network error'));
      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

      await downloadAction('https://example.com', {});

      // Expect process.exit is called with 1
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    // Should should handle non-Error thrown values
    it('should handle non-Error thrown values', async () => {
      const { checkDependencies } = await import('../../utils/dependencies.js');
      const { validateUrl, validateFormat } = await import('../../utils/validations.js');
      const { downloadVideo, getVideoInfo } = await import('../../utils/ytdlp.js');
      const { createProgressBar } = await import('../../utils/progress.js');

      vi.mocked(checkDependencies).mockResolvedValue({ ok: true, missing: [] });
      vi.mocked(validateUrl).mockReturnValue(true);
      vi.mocked(validateFormat).mockReturnValue(undefined);
      vi.mocked(getVideoInfo).mockResolvedValue({ title: 'Test', video_id: '123', ext: 'mp4' });
      vi.mocked(createProgressBar).mockReturnValue(mockProgressBar as never);
      vi.mocked(downloadVideo).mockRejectedValue('string error');
      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

      await downloadAction('https://example.com', {});

      // Expect process.exit is called with 1
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    // Should should exit when validateFormat throws error
    it('should exit when validateFormat throws error', async () => {
      const { checkDependencies } = await import('../../utils/dependencies.js');
      const { validateUrl, validateFormat } = await import('../../utils/validations.js');

      vi.mocked(checkDependencies).mockResolvedValue({ ok: true, missing: [] });
      vi.mocked(validateUrl).mockReturnValue(true);
      vi.mocked(validateFormat).mockImplementation(() => {
        throw new Error('Invalid format');
      });
      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

      await downloadAction('https://example.com', {});

      // Expect process.exit is called with 1
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    // Should should exit when user declines overwrite
    it('should exit when user declines overwrite', async () => {
      const { checkDependencies } = await import('../../utils/dependencies.js');
      const { validateUrl, validateFormat } = await import('../../utils/validations.js');
      const { getVideoInfo } = await import('../../utils/ytdlp.js');
      const { checkAndPromptOverwrite } = await import('../../utils/prompt.js');

      vi.mocked(checkDependencies).mockResolvedValue({ ok: true, missing: [] });
      vi.mocked(validateUrl).mockReturnValue(true);
      vi.mocked(validateFormat).mockReturnValue(undefined);
      vi.mocked(getVideoInfo).mockResolvedValue({ title: 'Test', video_id: '123', ext: 'mp4' });
      vi.mocked(checkAndPromptOverwrite).mockResolvedValue(false);

      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

      await downloadAction('https://example.com', {});

      // Expect process.exit is called with 0
      expect(exitSpy).toHaveBeenCalledWith(0);
    });

    // Should should convert downloaded file when convert option is set
    it('should convert downloaded file when convert option is set', async () => {
      const { checkDependencies } = await import('../../utils/dependencies.js');
      const { validateUrl, validateFormat } = await import('../../utils/validations.js');
      const { getVideoInfo } = await import('../../utils/ytdlp.js');
      const { downloadVideo } = await import('../../utils/ytdlp.js');
      const { convertVideo } = await import('../../utils/ffmpeg.js');
      const { createProgressBar } = await import('../../utils/progress.js');
      const { unlink } = await import('fs/promises');

      vi.mocked(checkDependencies).mockResolvedValue({ ok: true, missing: [] });
      vi.mocked(validateUrl).mockReturnValue(true);
      vi.mocked(validateFormat).mockReturnValue(undefined);
      vi.mocked(getVideoInfo).mockResolvedValue({ title: 'Test', video_id: '123', ext: 'webm' });
      vi.mocked(downloadVideo).mockResolvedValue(undefined);
      vi.mocked(createProgressBar).mockReturnValue(mockProgressBar as never);
      vi.mocked(convertVideo).mockResolvedValue(undefined);
      vi.mocked(unlink).mockResolvedValue(undefined);

      await downloadAction('https://example.com', { convert: true, format: 'mp4' });

      // Expect convertVideo is called
      expect(convertVideo).toHaveBeenCalled();
    });

    // Should should call splitAction when split option is set
    it('should call splitAction when split option is set', async () => {
      const { checkDependencies } = await import('../../utils/dependencies.js');
      const { validateUrl, validateFormat } = await import('../../utils/validations.js');
      const { getVideoInfo } = await import('../../utils/ytdlp.js');
      const { downloadVideo } = await import('../../utils/ytdlp.js');
      const { createProgressBar } = await import('../../utils/progress.js');
      const { parseSplitValue } = await import('../../utils/split.js');
      const { splitAction } = await import('../split.js');

      vi.mocked(checkDependencies).mockResolvedValue({ ok: true, missing: [] });
      vi.mocked(validateUrl).mockReturnValue(true);
      vi.mocked(validateFormat).mockReturnValue(undefined);
      vi.mocked(getVideoInfo).mockResolvedValue({ title: 'Test', video_id: '123', ext: 'mp4' });
      vi.mocked(downloadVideo).mockResolvedValue(undefined);
      vi.mocked(createProgressBar).mockReturnValue(mockProgressBar as never);
      vi.mocked(parseSplitValue).mockReturnValue({ type: 'preset', value: 'instagram' });

      await downloadAction('https://example.com', { split: 'instagram' });

      // Expect splitAction is called
      expect(vi.mocked(splitAction)).toHaveBeenCalled();
    });

    // Should should handle non-Error thrown values in outer catch
    it('should handle non-Error thrown values in outer catch', async () => {
      const { checkDependencies } = await import('../../utils/dependencies.js');
      const { validateUrl } = await import('../../utils/validations.js');

      vi.mocked(checkDependencies).mockRejectedValue('unknown error');
      vi.mocked(validateUrl).mockReturnValue(true);
      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

      await downloadAction('https://example.com', {});

      // Expect process.exit is called with 1
      expect(exitSpy).toHaveBeenCalledWith(1);
    });
  });
});
