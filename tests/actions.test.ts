import { describe, it, expect, vi, beforeEach } from 'vitest';

import { audioAction } from '../src/commands/audio.js';
import { compactAction } from '../src/commands/compact.js';
import { compressAction } from '../src/commands/compress.js';
import { convertAction } from '../src/commands/convert.js';
import { downloadAction } from '../src/commands/download.js';
import { sliceAction } from '../src/commands/slice.js';
import { speedupAction } from '../src/commands/speedup.js';
import { splitAction } from '../src/commands/split.js';

vi.mock('../src/utils/dependencies.js', () => ({ checkDependencies: vi.fn(), runCommand: vi.fn() }));

vi.mock('../src/utils/ytdlp.js', () => ({
  downloadVideo: vi.fn(),
  getVideoInfo: vi.fn(),
  generateFilename: vi.fn((info, format) => `${info.title}_${info.video_id}.${format}`),
}));

vi.mock('../src/utils/ffmpeg.js', () => ({
  convertVideo: vi.fn(),
  compressVideo: vi.fn(),
  speedUpVideo: vi.fn(),
  extractAudio: vi.fn(),
  getVideoDuration: vi.fn(() => Promise.resolve(60)),
}));

vi.mock('../src/utils/split.js', () => ({
  splitVideoReencode: vi.fn(() => Promise.resolve(['output_001.mp4', 'output_002.mp4'])),
  splitVideoStreamCopy: vi.fn(() => Promise.resolve(['output_001.mp4', 'output_002.mp4'])),
}));

vi.mock('../src/utils/validations.js', () => ({
  validateUrl: vi.fn(),
  validateFormat: vi.fn(),
  validatePreset: vi.fn(),
  validateCRF: vi.fn(),
  validateSpeedRate: vi.fn(),
  validateBitrate: vi.fn(),
  validateFileExists: vi.fn(),
}));

vi.mock('../src/utils/progress.js', () => ({
  createProgressBar: vi.fn(),
  formatFileSize: vi.fn(() => ({ value: 100, unit: 'MB' })),
}));

vi.mock('fs/promises', () => ({ access: vi.fn().mockRejectedValue(new Error('File not found')) }));

vi.mock('../src/utils/prompt.js', () => ({
  checkAndPromptOverwrite: vi.fn().mockResolvedValue(true),
  promptOverwrite: vi.fn().mockResolvedValue(true),
}));

/* Mock progress bar */
const mockProgressBar = { start: vi.fn(), stop: vi.fn(), update: vi.fn() };

// Tests for Command actions
describe('Command actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Tests for downloadAction
  describe('downloadAction', () => {
    // Should should exit with error when dependencies missing
    it('should exit with error when dependencies missing', async () => {
      const { checkDependencies } = await import('../src/utils/dependencies.js');
      vi.mocked(checkDependencies).mockResolvedValue({ ok: false, missing: ['ffmpeg'] });
      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

      await downloadAction('https://example.com', {});

      // Expect process.exit is called with 1
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    // Should should exit with error when URL is invalid
    it('should exit with error when URL is invalid', async () => {
      const { checkDependencies } = await import('../src/utils/dependencies.js');
      const { validateUrl } = await import('../src/utils/validations.js');
      vi.mocked(checkDependencies).mockResolvedValue({ ok: true, missing: [] });
      vi.mocked(validateUrl).mockReturnValue(false);
      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

      await downloadAction('not-a-url', {});

      // Expect process.exit is called with 1
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    // Should should download video with default options
    it('should download video with default options', async () => {
      const { checkDependencies } = await import('../src/utils/dependencies.js');
      const { validateUrl, validateFormat } = await import('../src/utils/validations.js');
      const { downloadVideo, getVideoInfo } = await import('../src/utils/ytdlp.js');
      const { createProgressBar } = await import('../src/utils/progress.js');

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
      const { checkDependencies } = await import('../src/utils/dependencies.js');
      const { validateUrl, validateFormat } = await import('../src/utils/validations.js');
      const { downloadVideo, getVideoInfo } = await import('../src/utils/ytdlp.js');
      const { createProgressBar } = await import('../src/utils/progress.js');

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
      const { checkDependencies } = await import('../src/utils/dependencies.js');
      const { validateUrl, validateFormat } = await import('../src/utils/validations.js');
      const { downloadVideo, getVideoInfo } = await import('../src/utils/ytdlp.js');
      const { createProgressBar } = await import('../src/utils/progress.js');

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
      const { checkDependencies } = await import('../src/utils/dependencies.js');
      const { validateUrl, validateFormat } = await import('../src/utils/validations.js');
      const { downloadVideo, getVideoInfo } = await import('../src/utils/ytdlp.js');
      const { createProgressBar } = await import('../src/utils/progress.js');

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
      const { checkDependencies } = await import('../src/utils/dependencies.js');
      const { validateUrl, validateFormat } = await import('../src/utils/validations.js');
      const { downloadVideo, getVideoInfo } = await import('../src/utils/ytdlp.js');
      const { createProgressBar } = await import('../src/utils/progress.js');

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
      const { checkDependencies } = await import('../src/utils/dependencies.js');
      const { validateUrl, validateFormat } = await import('../src/utils/validations.js');
      const { downloadVideo, getVideoInfo } = await import('../src/utils/ytdlp.js');
      const { createProgressBar } = await import('../src/utils/progress.js');

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
      const { checkDependencies } = await import('../src/utils/dependencies.js');
      const { validateUrl, validateFormat } = await import('../src/utils/validations.js');

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

    // Should should handle non-Error thrown values in outer catch
    it('should handle non-Error thrown values in outer catch', async () => {
      const { checkDependencies } = await import('../src/utils/dependencies.js');
      const { validateUrl } = await import('../src/utils/validations.js');

      vi.mocked(checkDependencies).mockRejectedValue('unknown error');
      vi.mocked(validateUrl).mockReturnValue(true);
      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

      await downloadAction('https://example.com', {});

      // Expect process.exit is called with 1
      expect(exitSpy).toHaveBeenCalledWith(1);
    });
  });

  // Tests for convertAction
  describe('convertAction', () => {
    // Should should exit when dependencies missing
    it('should exit when dependencies missing', async () => {
      const { checkDependencies } = await import('../src/utils/dependencies.js');
      vi.mocked(checkDependencies).mockResolvedValue({ ok: false, missing: ['ffmpeg'] });
      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

      await convertAction('input.avi', {});

      // Expect process.exit is called with 1
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    // Should should convert video with default options
    it('should convert video with default options', async () => {
      const { checkDependencies } = await import('../src/utils/dependencies.js');
      const { validateFileExists, validateFormat, validatePreset } = await import('../src/utils/validations.js');
      const { convertVideo } = await import('../src/utils/ffmpeg.js');
      const { createProgressBar } = await import('../src/utils/progress.js');

      vi.mocked(checkDependencies).mockResolvedValue({ ok: true, missing: [] });
      vi.mocked(validateFileExists).mockResolvedValue(undefined);
      vi.mocked(validateFormat).mockReturnValue(undefined);
      vi.mocked(validatePreset).mockReturnValue(undefined);
      vi.mocked(convertVideo).mockResolvedValue(undefined);
      vi.mocked(createProgressBar).mockReturnValue(mockProgressBar as never);

      await convertAction('input.avi', {});

      // Expect convertVideo is called
      expect(convertVideo).toHaveBeenCalled();
    });

    // Should should use provided output option
    it('should use provided output option', async () => {
      const { checkDependencies } = await import('../src/utils/dependencies.js');
      const { validateFileExists, validateFormat, validatePreset } = await import('../src/utils/validations.js');
      const { convertVideo } = await import('../src/utils/ffmpeg.js');
      const { createProgressBar } = await import('../src/utils/progress.js');

      vi.mocked(checkDependencies).mockResolvedValue({ ok: true, missing: [] });
      vi.mocked(validateFileExists).mockResolvedValue(undefined);
      vi.mocked(validateFormat).mockReturnValue(undefined);
      vi.mocked(validatePreset).mockReturnValue(undefined);
      vi.mocked(convertVideo).mockResolvedValue(undefined);
      vi.mocked(createProgressBar).mockReturnValue(mockProgressBar as never);

      await convertAction('input.avi', { output: 'custom_out.mp4', format: 'mp4', preset: 'slow' });

      const callArgs = vi.mocked(convertVideo).mock.calls[0];

      // Expect convertVideo is called with custom output
      expect(callArgs?.[1]).toBe('custom_out.mp4');
    });

    // Should should invoke progressCallback
    it('should invoke progressCallback', async () => {
      const { checkDependencies } = await import('../src/utils/dependencies.js');
      const { validateFileExists, validateFormat, validatePreset } = await import('../src/utils/validations.js');
      const { convertVideo } = await import('../src/utils/ffmpeg.js');
      const { createProgressBar } = await import('../src/utils/progress.js');

      vi.mocked(checkDependencies).mockResolvedValue({ ok: true, missing: [] });
      vi.mocked(validateFileExists).mockResolvedValue(undefined);
      vi.mocked(validateFormat).mockReturnValue(undefined);
      vi.mocked(validatePreset).mockReturnValue(undefined);
      vi.mocked(createProgressBar).mockReturnValue(mockProgressBar as never);
      vi.mocked(convertVideo).mockImplementation(async (_i, _o, _f, _p, onProgress) => {
        if (onProgress) onProgress(50, 30, 60);
      });

      await convertAction('input.avi', {});

      // Expect progress bar is updated
      expect(mockProgressBar.update).toHaveBeenCalledWith(50);
    });

    // Should should not update progress bar when percentage is 0
    it('should not update progress bar when percentage is 0', async () => {
      const { checkDependencies } = await import('../src/utils/dependencies.js');
      const { validateFileExists, validateFormat, validatePreset } = await import('../src/utils/validations.js');
      const { convertVideo } = await import('../src/utils/ffmpeg.js');
      const { createProgressBar } = await import('../src/utils/progress.js');

      vi.mocked(checkDependencies).mockResolvedValue({ ok: true, missing: [] });
      vi.mocked(validateFileExists).mockResolvedValue(undefined);
      vi.mocked(validateFormat).mockReturnValue(undefined);
      vi.mocked(validatePreset).mockReturnValue(undefined);
      vi.mocked(createProgressBar).mockReturnValue(mockProgressBar as never);
      vi.mocked(convertVideo).mockImplementation(async (_i, _o, _f, _p, onProgress) => {
        if (onProgress) onProgress(0, 0, 60);
      });

      await convertAction('input.avi', {});

      // Expect progress bar update is not called
      expect(mockProgressBar.update).not.toHaveBeenCalled();
    });

    // Should should handle errors and exit 1
    it('should handle errors and exit 1', async () => {
      const { checkDependencies } = await import('../src/utils/dependencies.js');
      const { validateFileExists } = await import('../src/utils/validations.js');
      vi.mocked(checkDependencies).mockResolvedValue({ ok: true, missing: [] });
      vi.mocked(validateFileExists).mockRejectedValue(new Error('File not found: input.avi'));
      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

      await convertAction('input.avi', {});

      // Expect process.exit is called with 1
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    // Should should handle non-Error thrown values
    it('should handle non-Error thrown values', async () => {
      const { checkDependencies } = await import('../src/utils/dependencies.js');
      const { validateFileExists } = await import('../src/utils/validations.js');
      vi.mocked(checkDependencies).mockResolvedValue({ ok: true, missing: [] });
      vi.mocked(validateFileExists).mockRejectedValue('string error');
      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

      await convertAction('input.avi', {});

      // Expect process.exit is called with 1
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    // Should should exit when validateFormat throws error
    it('should exit when validateFormat throws error', async () => {
      const { checkDependencies } = await import('../src/utils/dependencies.js');
      const { validateFileExists, validateFormat } = await import('../src/utils/validations.js');
      vi.mocked(checkDependencies).mockResolvedValue({ ok: true, missing: [] });
      vi.mocked(validateFileExists).mockResolvedValue(undefined);
      vi.mocked(validateFormat).mockImplementation(() => {
        throw new Error('Invalid format: xyz');
      });
      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

      await convertAction('input.avi', {});

      // Expect process.exit is called with 1
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    // Should should exit when validatePreset throws error
    it('should exit when validatePreset throws error', async () => {
      const { checkDependencies } = await import('../src/utils/dependencies.js');
      const { validateFileExists, validateFormat, validatePreset } = await import('../src/utils/validations.js');
      vi.mocked(checkDependencies).mockResolvedValue({ ok: true, missing: [] });
      vi.mocked(validateFileExists).mockResolvedValue(undefined);
      vi.mocked(validateFormat).mockReturnValue(undefined);
      vi.mocked(validatePreset).mockImplementation(() => {
        throw new Error('Invalid preset: invalid');
      });

      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

      await convertAction('input.avi', {});

      // Expect process.exit is called with 1
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    // Should should handle convertVideo errors and exit 1
    it('should handle convertVideo errors and exit 1', async () => {
      const { checkDependencies } = await import('../src/utils/dependencies.js');
      const { validateFileExists, validateFormat, validatePreset } = await import('../src/utils/validations.js');
      const { convertVideo } = await import('../src/utils/ffmpeg.js');
      const { createProgressBar } = await import('../src/utils/progress.js');

      vi.mocked(checkDependencies).mockResolvedValue({ ok: true, missing: [] });
      vi.mocked(validateFileExists).mockResolvedValue(undefined);
      vi.mocked(validateFormat).mockReturnValue(undefined);
      vi.mocked(validatePreset).mockReturnValue(undefined);
      vi.mocked(convertVideo).mockRejectedValue(new Error('Conversion failed'));
      vi.mocked(createProgressBar).mockReturnValue(mockProgressBar as never);

      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

      await convertAction('input.avi', {});

      // Expect progress bar is stopped and process exits with 1
      expect(mockProgressBar.stop).toHaveBeenCalled();
      expect(exitSpy).toHaveBeenCalledWith(1);
    });
  });

  // Tests for compressAction
  describe('compressAction', () => {
    // Should should exit when dependencies missing
    it('should exit when dependencies missing', async () => {
      const { checkDependencies } = await import('../src/utils/dependencies.js');

      vi.mocked(checkDependencies).mockResolvedValue({ ok: false, missing: ['ffmpeg'] });

      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

      await compressAction('input.mp4', {});

      // Expect process.exit is called with 1
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    // Should should compress video with default options
    it('should compress video with default options', async () => {
      const { checkDependencies } = await import('../src/utils/dependencies.js');
      const { validateFileExists, validatePreset, validateCRF } = await import('../src/utils/validations.js');
      const { compressVideo } = await import('../src/utils/ffmpeg.js');
      const { createProgressBar } = await import('../src/utils/progress.js');

      vi.mocked(checkDependencies).mockResolvedValue({ ok: true, missing: [] });
      vi.mocked(validateFileExists).mockResolvedValue(undefined);
      vi.mocked(validatePreset).mockReturnValue(undefined);
      vi.mocked(validateCRF).mockReturnValue(undefined);
      vi.mocked(compressVideo).mockResolvedValue(undefined);
      vi.mocked(createProgressBar).mockReturnValue(mockProgressBar as never);

      await compressAction('input.mp4', {});

      // Expect compressVideo is called
      expect(compressVideo).toHaveBeenCalled();
    });

    // Should should use provided output option
    it('should use provided output option', async () => {
      const { checkDependencies } = await import('../src/utils/dependencies.js');
      const { validateFileExists, validatePreset, validateCRF } = await import('../src/utils/validations.js');
      const { compressVideo } = await import('../src/utils/ffmpeg.js');
      const { createProgressBar } = await import('../src/utils/progress.js');

      vi.mocked(checkDependencies).mockResolvedValue({ ok: true, missing: [] });
      vi.mocked(validateFileExists).mockResolvedValue(undefined);
      vi.mocked(validatePreset).mockReturnValue(undefined);
      vi.mocked(validateCRF).mockReturnValue(undefined);
      vi.mocked(compressVideo).mockResolvedValue(undefined);
      vi.mocked(createProgressBar).mockReturnValue(mockProgressBar as never);

      await compressAction('input.mp4', { output: 'small.mp4', crf: 23, preset: 'slow' });

      const callArgs = vi.mocked(compressVideo).mock.calls[0];

      // Expect compressVideo is called with custom output and crf
      expect(callArgs?.[1]).toBe('small.mp4');
      expect(callArgs?.[2]).toBe(23);
    });

    // Should should invoke progressCallback
    it('should invoke progressCallback', async () => {
      const { checkDependencies } = await import('../src/utils/dependencies.js');
      const { validateFileExists, validatePreset, validateCRF } = await import('../src/utils/validations.js');
      const { compressVideo } = await import('../src/utils/ffmpeg.js');
      const { createProgressBar } = await import('../src/utils/progress.js');

      vi.mocked(checkDependencies).mockResolvedValue({ ok: true, missing: [] });
      vi.mocked(validateFileExists).mockResolvedValue(undefined);
      vi.mocked(validatePreset).mockReturnValue(undefined);
      vi.mocked(validateCRF).mockReturnValue(undefined);
      vi.mocked(createProgressBar).mockReturnValue(mockProgressBar as never);
      vi.mocked(compressVideo).mockImplementation(async (_i, _o, _c, _p, onProgress) => {
        if (onProgress) onProgress(75, 45, 60);
      });

      await compressAction('input.mp4', {});

      // Expect progress bar is updated
      expect(mockProgressBar.update).toHaveBeenCalledWith(75);
    });

    // Should should not update progress bar when percentage is 0
    it('should not update progress bar when percentage is 0', async () => {
      const { checkDependencies } = await import('../src/utils/dependencies.js');
      const { validateFileExists, validatePreset, validateCRF } = await import('../src/utils/validations.js');
      const { compressVideo } = await import('../src/utils/ffmpeg.js');
      const { createProgressBar } = await import('../src/utils/progress.js');

      vi.mocked(checkDependencies).mockResolvedValue({ ok: true, missing: [] });
      vi.mocked(validateFileExists).mockResolvedValue(undefined);
      vi.mocked(validatePreset).mockReturnValue(undefined);
      vi.mocked(validateCRF).mockReturnValue(undefined);
      vi.mocked(createProgressBar).mockReturnValue(mockProgressBar as never);
      vi.mocked(compressVideo).mockImplementation(async (_i, _o, _c, _p, onProgress) => {
        if (onProgress) onProgress(0, 0, 60);
      });

      await compressAction('input.mp4', {});

      // Expect progress bar update is not called
      expect(mockProgressBar.update).not.toHaveBeenCalled();
    });

    // Should should handle errors and exit 1
    it('should handle errors and exit 1', async () => {
      const { checkDependencies } = await import('../src/utils/dependencies.js');
      const { validateFileExists } = await import('../src/utils/validations.js');

      vi.mocked(checkDependencies).mockResolvedValue({ ok: true, missing: [] });
      vi.mocked(validateFileExists).mockRejectedValue(new Error('File not found'));

      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

      await compressAction('input.mp4', {});

      // Expect process.exit is called with 1
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    // Should should handle non-Error thrown values
    it('should handle non-Error thrown values', async () => {
      const { checkDependencies } = await import('../src/utils/dependencies.js');
      const { validateFileExists } = await import('../src/utils/validations.js');

      vi.mocked(checkDependencies).mockResolvedValue({ ok: true, missing: [] });
      vi.mocked(validateFileExists).mockRejectedValue('string error');

      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

      await compressAction('input.mp4', {});

      // Expect process.exit is called with 1
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    // Should should exit when validatePreset throws error
    it('should exit when validatePreset throws error', async () => {
      const { checkDependencies } = await import('../src/utils/dependencies.js');
      const { validateFileExists, validatePreset } = await import('../src/utils/validations.js');

      vi.mocked(checkDependencies).mockResolvedValue({ ok: true, missing: [] });
      vi.mocked(validateFileExists).mockResolvedValue(undefined);
      vi.mocked(validatePreset).mockImplementation(() => {
        throw new Error('Invalid preset');
      });

      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

      await compressAction('input.mp4', {});

      // Expect process.exit is called with 1
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    // Should should handle compressVideo errors and exit 1
    it('should handle compressVideo errors and exit 1', async () => {
      const { checkDependencies } = await import('../src/utils/dependencies.js');
      const { validateFileExists, validatePreset, validateCRF } = await import('../src/utils/validations.js');
      const { compressVideo } = await import('../src/utils/ffmpeg.js');
      const { createProgressBar } = await import('../src/utils/progress.js');

      vi.mocked(checkDependencies).mockResolvedValue({ ok: true, missing: [] });
      vi.mocked(validateFileExists).mockResolvedValue(undefined);
      vi.mocked(validatePreset).mockReturnValue(undefined);
      vi.mocked(validateCRF).mockReturnValue(undefined);
      vi.mocked(compressVideo).mockRejectedValue(new Error('Compression failed'));
      vi.mocked(createProgressBar).mockReturnValue(mockProgressBar as never);

      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

      await compressAction('input.mp4', {});

      // Expect progress bar is stopped and process exits with 1
      expect(mockProgressBar.stop).toHaveBeenCalled();
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    // Should should exit when validateCRF throws error
    it('should exit when validateCRF throws error', async () => {
      const { checkDependencies } = await import('../src/utils/dependencies.js');
      const { validateFileExists, validateCRF } = await import('../src/utils/validations.js');

      vi.mocked(checkDependencies).mockResolvedValue({ ok: true, missing: [] });
      vi.mocked(validateFileExists).mockResolvedValue(undefined);
      vi.mocked(validateCRF).mockImplementation(() => {
        throw new Error('Invalid CRF');
      });

      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

      await compressAction('input.mp4', {});

      // Expect process.exit is called with 1
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    // Should should handle non-Error thrown values in outer catch
    it('should handle non-Error thrown values in outer catch', async () => {
      const { checkDependencies } = await import('../src/utils/dependencies.js');

      vi.mocked(checkDependencies).mockRejectedValue('unknown error');

      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

      await compressAction('input.mp4', {});

      // Expect process.exit is called with 1
      expect(exitSpy).toHaveBeenCalledWith(1);
    });
  });

  // Tests for speedupAction
  describe('speedupAction', () => {
    // Should should exit when dependencies missing
    it('should exit when dependencies missing', async () => {
      const { checkDependencies } = await import('../src/utils/dependencies.js');

      vi.mocked(checkDependencies).mockResolvedValue({ ok: false, missing: ['ffmpeg'] });

      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

      await speedupAction('input.mp4', {});

      // Expect process.exit is called with 1
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    // Should should speed up video with default rate
    it('should speed up video with default rate', async () => {
      const { checkDependencies } = await import('../src/utils/dependencies.js');
      const { validateFileExists, validateSpeedRate } = await import('../src/utils/validations.js');
      const { speedUpVideo } = await import('../src/utils/ffmpeg.js');
      const { createProgressBar } = await import('../src/utils/progress.js');

      vi.mocked(checkDependencies).mockResolvedValue({ ok: true, missing: [] });
      vi.mocked(validateFileExists).mockResolvedValue(undefined);
      vi.mocked(validateSpeedRate).mockReturnValue(undefined);
      vi.mocked(speedUpVideo).mockResolvedValue(undefined);
      vi.mocked(createProgressBar).mockReturnValue(mockProgressBar as never);

      await speedupAction('input.mp4', {});

      // Expect speedUpVideo is called
      expect(speedUpVideo).toHaveBeenCalled();
    });

    // Should should use provided output option
    it('should use provided output option', async () => {
      const { checkDependencies } = await import('../src/utils/dependencies.js');
      const { validateFileExists, validateSpeedRate } = await import('../src/utils/validations.js');
      const { speedUpVideo } = await import('../src/utils/ffmpeg.js');
      const { createProgressBar } = await import('../src/utils/progress.js');

      vi.mocked(checkDependencies).mockResolvedValue({ ok: true, missing: [] });
      vi.mocked(validateFileExists).mockResolvedValue(undefined);
      vi.mocked(validateSpeedRate).mockReturnValue(undefined);
      vi.mocked(speedUpVideo).mockResolvedValue(undefined);
      vi.mocked(createProgressBar).mockReturnValue(mockProgressBar as never);

      await speedupAction('input.mp4', { output: 'out_fast.mp4', rate: 2 });

      // Expect speedUpVideo is called with custom output
      const callArgs = vi.mocked(speedUpVideo).mock.calls[0];
      expect(callArgs?.[1]).toBe('out_fast.mp4');
    });

    // Should should invoke progressCallback
    it('should invoke progressCallback', async () => {
      const { checkDependencies } = await import('../src/utils/dependencies.js');
      const { validateFileExists, validateSpeedRate } = await import('../src/utils/validations.js');
      const { speedUpVideo } = await import('../src/utils/ffmpeg.js');
      const { createProgressBar } = await import('../src/utils/progress.js');

      vi.mocked(checkDependencies).mockResolvedValue({ ok: true, missing: [] });
      vi.mocked(validateFileExists).mockResolvedValue(undefined);
      vi.mocked(validateSpeedRate).mockReturnValue(undefined);
      vi.mocked(createProgressBar).mockReturnValue(mockProgressBar as never);
      vi.mocked(speedUpVideo).mockImplementation(async (_i, _o, _r, onProgress) => {
        if (onProgress) onProgress(80, 48, 60);
      });

      await speedupAction('input.mp4', { rate: 2 });

      // Expect progress bar is updated
      expect(mockProgressBar.update).toHaveBeenCalledWith(80);
    });

    // Should should not update progress bar when percentage is 0
    it('should not update progress bar when percentage is 0', async () => {
      const { checkDependencies } = await import('../src/utils/dependencies.js');
      const { validateFileExists, validateSpeedRate } = await import('../src/utils/validations.js');
      const { speedUpVideo } = await import('../src/utils/ffmpeg.js');
      const { createProgressBar } = await import('../src/utils/progress.js');

      vi.mocked(checkDependencies).mockResolvedValue({ ok: true, missing: [] });
      vi.mocked(validateFileExists).mockResolvedValue(undefined);
      vi.mocked(validateSpeedRate).mockReturnValue(undefined);
      vi.mocked(createProgressBar).mockReturnValue(mockProgressBar as never);
      vi.mocked(speedUpVideo).mockImplementation(async (_i, _o, _r, onProgress) => {
        if (onProgress) onProgress(0, 0, 60);
      });

      await speedupAction('input.mp4', { rate: 2 });

      // Expect progress bar update is not called
      expect(mockProgressBar.update).not.toHaveBeenCalled();
    });

    // Should should not log faster or slower when rate is 1
    it('should not log faster or slower when rate is 1', async () => {
      const { checkDependencies } = await import('../src/utils/dependencies.js');
      const { validateFileExists, validateSpeedRate } = await import('../src/utils/validations.js');
      const { speedUpVideo } = await import('../src/utils/ffmpeg.js');
      const { createProgressBar } = await import('../src/utils/progress.js');

      vi.mocked(checkDependencies).mockResolvedValue({ ok: true, missing: [] });
      vi.mocked(validateFileExists).mockResolvedValue(undefined);
      vi.mocked(validateSpeedRate).mockReturnValue(undefined);
      vi.mocked(speedUpVideo).mockResolvedValue(undefined);
      vi.mocked(createProgressBar).mockReturnValue(mockProgressBar as never);

      await speedupAction('input.mp4', { rate: 1 });

      const consoleCalls = vi.mocked(console.log).mock.calls.map((c: unknown[]) => String(c[0]));

      // Expect console.log is not called with 'faster' or 'slower'
      expect(consoleCalls.some((m: string) => m?.includes('faster'))).toBe(false);
      expect(consoleCalls.some((m: string) => m?.includes('slower'))).toBe(false);
    });

    // Should should handle errors and exit 1
    it('should handle errors and exit 1', async () => {
      const { checkDependencies } = await import('../src/utils/dependencies.js');
      const { validateFileExists } = await import('../src/utils/validations.js');

      vi.mocked(checkDependencies).mockResolvedValue({ ok: true, missing: [] });
      vi.mocked(validateFileExists).mockRejectedValue(new Error('File not found'));

      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

      await speedupAction('input.mp4', {});

      // Expect process.exit is called with 1
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    // Should should handle non-Error thrown values
    it('should handle non-Error thrown values', async () => {
      const { checkDependencies } = await import('../src/utils/dependencies.js');
      const { validateFileExists } = await import('../src/utils/validations.js');

      vi.mocked(checkDependencies).mockResolvedValue({ ok: true, missing: [] });
      vi.mocked(validateFileExists).mockRejectedValue('string error');

      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

      await speedupAction('input.mp4', {});

      // Expect process.exit is called with 1
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    // Should should exit when validateSpeedRate throws error
    it('should exit when validateSpeedRate throws error', async () => {
      const { checkDependencies } = await import('../src/utils/dependencies.js');
      const { validateFileExists, validateSpeedRate } = await import('../src/utils/validations.js');

      vi.mocked(checkDependencies).mockResolvedValue({ ok: true, missing: [] });
      vi.mocked(validateFileExists).mockResolvedValue(undefined);
      vi.mocked(validateSpeedRate).mockImplementation(() => {
        throw new Error('Invalid speed rate');
      });

      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

      await speedupAction('input.mp4', {});

      // Expect process.exit is called with 1
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    // Should should handle speedUpVideo errors and exit 1
    it('should handle speedUpVideo errors and exit 1', async () => {
      const { checkDependencies } = await import('../src/utils/dependencies.js');
      const { validateFileExists, validateSpeedRate } = await import('../src/utils/validations.js');
      const { speedUpVideo } = await import('../src/utils/ffmpeg.js');
      const { createProgressBar } = await import('../src/utils/progress.js');

      vi.mocked(checkDependencies).mockResolvedValue({ ok: true, missing: [] });
      vi.mocked(validateFileExists).mockResolvedValue(undefined);
      vi.mocked(validateSpeedRate).mockReturnValue(undefined);
      vi.mocked(speedUpVideo).mockRejectedValue(new Error('Speed adjustment failed'));
      vi.mocked(createProgressBar).mockReturnValue(mockProgressBar as never);

      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

      await speedupAction('input.mp4', {});

      // Expect progress bar is stopped and process exits with 1
      expect(mockProgressBar.stop).toHaveBeenCalled();
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    // Should should handle non-Error thrown values in outer catch
    it('should handle non-Error thrown values in outer catch', async () => {
      const { checkDependencies } = await import('../src/utils/dependencies.js');

      vi.mocked(checkDependencies).mockRejectedValue('unknown error');

      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

      await speedupAction('input.mp4', {});

      // Expect process.exit is called with 1
      expect(exitSpy).toHaveBeenCalledWith(1);
    });
  });

  // Tests for audioAction
  describe('audioAction', () => {
    // Should should exit when dependencies missing
    it('should exit when dependencies missing', async () => {
      const { checkDependencies } = await import('../src/utils/dependencies.js');

      vi.mocked(checkDependencies).mockResolvedValue({ ok: false, missing: ['ffmpeg'] });

      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

      await audioAction('input.mp4', {});

      // Expect process.exit is called with 1
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    // Should should extract audio with defaults
    it('should extract audio with defaults', async () => {
      const { checkDependencies } = await import('../src/utils/dependencies.js');
      const { validateFileExists, validateFormat, validateBitrate } = await import('../src/utils/validations.js');
      const { extractAudio } = await import('../src/utils/ffmpeg.js');

      vi.mocked(checkDependencies).mockResolvedValue({ ok: true, missing: [] });
      vi.mocked(validateFileExists).mockResolvedValue(undefined);
      vi.mocked(validateFormat).mockReturnValue(undefined);
      vi.mocked(validateBitrate).mockReturnValue(undefined);
      vi.mocked(extractAudio).mockResolvedValue(undefined);

      await audioAction('input.mp4', {});

      // Expect extractAudio is called
      expect(extractAudio).toHaveBeenCalled();
    });

    // Should should use provided output, format and bitrate
    it('should use provided output, format and bitrate', async () => {
      const { checkDependencies } = await import('../src/utils/dependencies.js');
      const { validateFileExists, validateFormat, validateBitrate } = await import('../src/utils/validations.js');
      const { extractAudio } = await import('../src/utils/ffmpeg.js');

      vi.mocked(checkDependencies).mockResolvedValue({ ok: true, missing: [] });
      vi.mocked(validateFileExists).mockResolvedValue(undefined);
      vi.mocked(validateFormat).mockReturnValue(undefined);
      vi.mocked(validateBitrate).mockReturnValue(undefined);
      vi.mocked(extractAudio).mockResolvedValue(undefined);

      await audioAction('input.mp4', { output: 'track.wav', format: 'wav', bitrate: '320k' });

      // Expect extractAudio is called with custom options
      const callArgs = vi.mocked(extractAudio).mock.calls[0];
      expect(callArgs?.[1]).toBe('track.wav');
      expect(callArgs?.[2]).toBe('wav');
      expect(callArgs?.[3]).toBe('320k');
    });

    // Should should handle errors and exit 1
    it('should handle errors and exit 1', async () => {
      const { checkDependencies } = await import('../src/utils/dependencies.js');
      const { validateFileExists } = await import('../src/utils/validations.js');

      vi.mocked(checkDependencies).mockResolvedValue({ ok: true, missing: [] });
      vi.mocked(validateFileExists).mockRejectedValue(new Error('File not found'));

      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

      await audioAction('input.mp4', {});

      // Expect process.exit is called with 1
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    // Should should handle non-Error thrown values
    it('should handle non-Error thrown values', async () => {
      const { checkDependencies } = await import('../src/utils/dependencies.js');
      const { validateFileExists } = await import('../src/utils/validations.js');

      vi.mocked(checkDependencies).mockResolvedValue({ ok: true, missing: [] });
      vi.mocked(validateFileExists).mockRejectedValue('string error');

      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

      await audioAction('input.mp4', {});

      // Expect process.exit is called with 1
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    // Should should exit when validateBitrate throws error
    it('should exit when validateBitrate throws error', async () => {
      const { checkDependencies } = await import('../src/utils/dependencies.js');
      const { validateFileExists, validateBitrate } = await import('../src/utils/validations.js');

      vi.mocked(checkDependencies).mockResolvedValue({ ok: true, missing: [] });
      vi.mocked(validateFileExists).mockResolvedValue(undefined);
      vi.mocked(validateBitrate).mockImplementation(() => {
        throw new Error('Invalid bitrate');
      });

      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

      await audioAction('input.mp4', {});

      // Expect process.exit is called with 1
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    // Should should handle extractAudio errors and exit 1
    it('should handle extractAudio errors and exit 1', async () => {
      const { checkDependencies } = await import('../src/utils/dependencies.js');
      const { validateFileExists, validateFormat, validateBitrate } = await import('../src/utils/validations.js');
      const { extractAudio } = await import('../src/utils/ffmpeg.js');

      vi.mocked(checkDependencies).mockResolvedValue({ ok: true, missing: [] });
      vi.mocked(validateFileExists).mockResolvedValue(undefined);
      vi.mocked(validateFormat).mockReturnValue(undefined);
      vi.mocked(validateBitrate).mockReturnValue(undefined);
      vi.mocked(extractAudio).mockRejectedValue(new Error('Audio extraction failed'));

      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

      await audioAction('input.mp4', {});

      // Expect process.exit is called with 1
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    // Should should exit when validateFormat throws error
    it('should exit when validateFormat throws error', async () => {
      const { checkDependencies } = await import('../src/utils/dependencies.js');
      const { validateFileExists, validateFormat } = await import('../src/utils/validations.js');

      vi.mocked(checkDependencies).mockResolvedValue({ ok: true, missing: [] });
      vi.mocked(validateFileExists).mockResolvedValue(undefined);
      vi.mocked(validateFormat).mockImplementation(() => {
        throw new Error('Invalid format');
      });

      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

      await audioAction('input.mp4', {});

      // Expect process.exit is called with 1
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    // Should should handle non-Error thrown values in outer catch
    it('should handle non-Error thrown values in outer catch', async () => {
      const { checkDependencies } = await import('../src/utils/dependencies.js');

      vi.mocked(checkDependencies).mockRejectedValue('unknown error');

      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

      await audioAction('input.mp4', {});

      // Expect process.exit is called with 1
      expect(exitSpy).toHaveBeenCalledWith(1);
    });
  });

  // Tests for compactAction
  describe('compactAction', () => {
    // Should should exit when dependencies missing
    it('should exit when dependencies missing', async () => {
      const { checkDependencies } = await import('../src/utils/dependencies.js');

      vi.mocked(checkDependencies).mockResolvedValue({ ok: false, missing: ['ffmpeg'] });

      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

      await compactAction('input.mp4', {});

      // Expect process.exit is called with 1
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    // Should should compact video with default options
    it('should compact video with default options', async () => {
      const { checkDependencies } = await import('../src/utils/dependencies.js');
      const { validateFileExists } = await import('../src/utils/validations.js');
      const { createProgressBar } = await import('../src/utils/progress.js');

      vi.mocked(checkDependencies).mockResolvedValue({ ok: true, missing: [] });
      vi.mocked(validateFileExists).mockResolvedValue(undefined);
      vi.mocked(createProgressBar).mockReturnValue(mockProgressBar as never);

      await compactAction('input.mp4', {});

      // Expect progress bar is started
      expect(mockProgressBar.start).toHaveBeenCalled();
    });

    // Should should handle non-Error thrown values in outer catch
    it('should handle non-Error thrown values in outer catch', async () => {
      const { checkDependencies } = await import('../src/utils/dependencies.js');

      vi.mocked(checkDependencies).mockRejectedValue('unknown error');

      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

      await compactAction('input.mp4', {});

      // Expect process.exit is called with 1
      expect(exitSpy).toHaveBeenCalledWith(1);
    });
  });

  // Tests for sliceAction
  describe('sliceAction', () => {
    // Should should exit when dependencies missing
    it('should exit when dependencies missing', async () => {
      const { checkDependencies } = await import('../src/utils/dependencies.js');

      vi.mocked(checkDependencies).mockResolvedValue({ ok: false, missing: ['ffmpeg'] });

      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

      await sliceAction('input.mp4', { start: '10', end: '30' });

      // Expect process.exit is called with 1
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    // Should should exit when start/end not provided
    it('should exit when start/end not provided', async () => {
      const { checkDependencies } = await import('../src/utils/dependencies.js');
      const { validateFileExists } = await import('../src/utils/validations.js');

      vi.mocked(checkDependencies).mockResolvedValue({ ok: true, missing: [] });
      vi.mocked(validateFileExists).mockResolvedValue(undefined);

      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

      await sliceAction('input.mp4', {});

      // Expect process.exit is called with 1
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    // Should should handle non-Error thrown values in outer catch
    it('should handle non-Error thrown values in outer catch', async () => {
      const { checkDependencies } = await import('../src/utils/dependencies.js');

      vi.mocked(checkDependencies).mockRejectedValue('unknown error');

      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

      await sliceAction('input.mp4', { start: '10', end: '30' });

      // Expect process.exit is called with 1
      expect(exitSpy).toHaveBeenCalledWith(1);
    });
  });

  // Tests for splitAction
  describe('splitAction', () => {
    // Should should exit when dependencies missing
    it('should exit when dependencies missing', async () => {
      const { checkDependencies } = await import('../src/utils/dependencies.js');

      vi.mocked(checkDependencies).mockResolvedValue({ ok: false, missing: ['ffmpeg'] });

      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

      await splitAction('input.mp4', { preset: 'instagram' });

      // Expect process.exit is called with 1
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    // Should should exit when neither preset nor duration provided
    it('should exit when neither preset nor duration provided', async () => {
      const { checkDependencies } = await import('../src/utils/dependencies.js');
      const { validateFileExists } = await import('../src/utils/validations.js');

      vi.mocked(checkDependencies).mockResolvedValue({ ok: true, missing: [] });
      vi.mocked(validateFileExists).mockResolvedValue(undefined);

      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

      await splitAction('input.mp4', {});

      // Expect process.exit is called with 1
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    // Should should exit when both preset and duration provided
    it('should exit when both preset and duration provided', async () => {
      const { checkDependencies } = await import('../src/utils/dependencies.js');
      const { validateFileExists } = await import('../src/utils/validations.js');

      vi.mocked(checkDependencies).mockResolvedValue({ ok: true, missing: [] });
      vi.mocked(validateFileExists).mockResolvedValue(undefined);

      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

      await splitAction('input.mp4', { preset: 'instagram', duration: '60' });

      // Expect process.exit is called with 1
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    // Should should handle non-Error thrown values in outer catch
    it('should handle non-Error thrown values in outer catch', async () => {
      const { checkDependencies } = await import('../src/utils/dependencies.js');

      vi.mocked(checkDependencies).mockRejectedValue('unknown error');

      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

      await splitAction('input.mp4', { preset: 'instagram' });

      // Expect process.exit is called with 1
      expect(exitSpy).toHaveBeenCalledWith(1);
    });
  });
});
