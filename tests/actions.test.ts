import { describe, it, expect, vi, beforeEach } from 'vitest';

import { audioAction } from '../src/commands/audio.js';
import { compressAction } from '../src/commands/compress.js';
import { convertAction } from '../src/commands/convert.js';
import { downloadAction } from '../src/commands/download.js';
import { speedupAction } from '../src/commands/speedup.js';

vi.mock('../src/utils/dependencies.js', () => ({ checkDependencies: vi.fn() }));

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

vi.mock('fs/promises', () => ({ access: vi.fn() }));

/* Mock progress bar */
const mockProgressBar = { start: vi.fn(), stop: vi.fn(), update: vi.fn() };

// describe: Command actions
describe('Command actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // describe: downloadAction
  describe('downloadAction', () => {
    // it: should exit with error when dependencies missing
    it('should exit with error when dependencies missing', async () => {
      const { checkDependencies } = await import('../src/utils/dependencies.js');
      vi.mocked(checkDependencies).mockResolvedValue({ ok: false, missing: ['ffmpeg'] });
      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

      await downloadAction('https://example.com', {});

      // expect: process.exit is called with 1
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    // it: should exit with error when URL is invalid
    it('should exit with error when URL is invalid', async () => {
      const { checkDependencies } = await import('../src/utils/dependencies.js');
      const { validateUrl } = await import('../src/utils/validations.js');
      vi.mocked(checkDependencies).mockResolvedValue({ ok: true, missing: [] });
      vi.mocked(validateUrl).mockReturnValue(false);
      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

      await downloadAction('not-a-url', {});

      // expect: process.exit is called with 1
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    // it: should download video with default options
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

      // expect: downloadVideo is called
      expect(downloadVideo).toHaveBeenCalled();
    });

    // it: should use provided output and format options
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

      // expect: output uses videoInfo.ext not requested format
      const callArgs = vi.mocked(downloadVideo).mock.calls[0];
      expect(callArgs?.[1]).toBe('myvideo.mp4');
      expect(callArgs?.[2]).toBe('mkv');
    });

    // it: should append extension when output has no dot
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

      // expect: output appends format extension
      const callArgs = vi.mocked(downloadVideo).mock.calls[0];
      expect(callArgs?.[1]).toBe('myvideo.mp3');
    });

    // it: should call progressCallback and update progress bar
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

      // expect: progress bar is updated with percentage
      expect(mockProgressBar.update).toHaveBeenCalledWith(50, { total: 100 });
    });

    // it: should handle thrown errors and exit 1
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

      // expect: process.exit is called with 1
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    // it: should handle non-Error thrown values
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

      // expect: process.exit is called with 1
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    // it: should exit when validateFormat throws error
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

      // expect: process.exit is called with 1
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    // it: should handle non-Error thrown values in outer catch
    it('should handle non-Error thrown values in outer catch', async () => {
      const { checkDependencies } = await import('../src/utils/dependencies.js');
      const { validateUrl } = await import('../src/utils/validations.js');

      vi.mocked(checkDependencies).mockRejectedValue('unknown error');
      vi.mocked(validateUrl).mockReturnValue(true);
      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

      await downloadAction('https://example.com', {});

      // expect: process.exit is called with 1
      expect(exitSpy).toHaveBeenCalledWith(1);
    });
  });

  // describe: convertAction
  describe('convertAction', () => {
    // it: should exit when dependencies missing
    it('should exit when dependencies missing', async () => {
      const { checkDependencies } = await import('../src/utils/dependencies.js');
      vi.mocked(checkDependencies).mockResolvedValue({ ok: false, missing: ['ffmpeg'] });
      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

      await convertAction('input.avi', {});

      // expect: process.exit is called with 1
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    // it: should convert video with default options
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

      // expect: convertVideo is called
      expect(convertVideo).toHaveBeenCalled();
    });

    // it: should use provided output option
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

      await convertAction('input.avi', { output: 'custom_out.mp4', to: 'mp4', preset: 'slow' });

      // expect: convertVideo is called with custom output
      const callArgs = vi.mocked(convertVideo).mock.calls[0];
      expect(callArgs?.[1]).toBe('custom_out.mp4');
    });

    // it: should invoke progressCallback
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

      // expect: progress bar is updated
      expect(mockProgressBar.update).toHaveBeenCalledWith(50);
    });

    // it: should not update progress bar when percentage is 0
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

      // expect: progress bar update is not called
      expect(mockProgressBar.update).not.toHaveBeenCalled();
    });

    // it: should handle errors and exit 1
    it('should handle errors and exit 1', async () => {
      const { checkDependencies } = await import('../src/utils/dependencies.js');
      const { validateFileExists } = await import('../src/utils/validations.js');
      vi.mocked(checkDependencies).mockResolvedValue({ ok: true, missing: [] });
      vi.mocked(validateFileExists).mockRejectedValue(new Error('File not found: input.avi'));
      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

      await convertAction('input.avi', {});

      // expect: process.exit is called with 1
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    // it: should handle non-Error thrown values
    it('should handle non-Error thrown values', async () => {
      const { checkDependencies } = await import('../src/utils/dependencies.js');
      const { validateFileExists } = await import('../src/utils/validations.js');
      vi.mocked(checkDependencies).mockResolvedValue({ ok: true, missing: [] });
      vi.mocked(validateFileExists).mockRejectedValue('string error');
      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

      await convertAction('input.avi', {});

      // expect: process.exit is called with 1
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    // it: should exit when validateFormat throws error
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

      // expect: process.exit is called with 1
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    // it: should exit when validatePreset throws error
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

      // expect: process.exit is called with 1
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    // it: should handle convertVideo errors and exit 1
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

      // expect: progress bar is stopped and process exits with 1
      expect(mockProgressBar.stop).toHaveBeenCalled();
      expect(exitSpy).toHaveBeenCalledWith(1);
    });
  });

  // describe: compressAction
  describe('compressAction', () => {
    // it: should exit when dependencies missing
    it('should exit when dependencies missing', async () => {
      const { checkDependencies } = await import('../src/utils/dependencies.js');
      vi.mocked(checkDependencies).mockResolvedValue({ ok: false, missing: ['ffmpeg'] });
      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

      await compressAction('input.mp4', {});

      // expect: process.exit is called with 1
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    // it: should compress video with default options
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

      // expect: compressVideo is called
      expect(compressVideo).toHaveBeenCalled();
    });

    // it: should use provided output option
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

      // expect: compressVideo is called with custom output and crf
      const callArgs = vi.mocked(compressVideo).mock.calls[0];
      expect(callArgs?.[1]).toBe('small.mp4');
      expect(callArgs?.[2]).toBe(23);
    });

    // it: should invoke progressCallback
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

      // expect: progress bar is updated
      expect(mockProgressBar.update).toHaveBeenCalledWith(75);
    });

    // it: should not update progress bar when percentage is 0
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

      // expect: progress bar update is not called
      expect(mockProgressBar.update).not.toHaveBeenCalled();
    });

    // it: should handle errors and exit 1
    it('should handle errors and exit 1', async () => {
      const { checkDependencies } = await import('../src/utils/dependencies.js');
      const { validateFileExists } = await import('../src/utils/validations.js');
      vi.mocked(checkDependencies).mockResolvedValue({ ok: true, missing: [] });
      vi.mocked(validateFileExists).mockRejectedValue(new Error('File not found'));
      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

      await compressAction('input.mp4', {});

      // expect: process.exit is called with 1
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    // it: should handle non-Error thrown values
    it('should handle non-Error thrown values', async () => {
      const { checkDependencies } = await import('../src/utils/dependencies.js');
      const { validateFileExists } = await import('../src/utils/validations.js');
      vi.mocked(checkDependencies).mockResolvedValue({ ok: true, missing: [] });
      vi.mocked(validateFileExists).mockRejectedValue('string error');
      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

      await compressAction('input.mp4', {});

      // expect: process.exit is called with 1
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    // it: should exit when validatePreset throws error
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

      // expect: process.exit is called with 1
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    // it: should handle compressVideo errors and exit 1
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

      // expect: progress bar is stopped and process exits with 1
      expect(mockProgressBar.stop).toHaveBeenCalled();
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    // it: should exit when validateCRF throws error
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

      // expect: process.exit is called with 1
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    // it: should handle non-Error thrown values in outer catch
    it('should handle non-Error thrown values in outer catch', async () => {
      const { checkDependencies } = await import('../src/utils/dependencies.js');
      vi.mocked(checkDependencies).mockRejectedValue('unknown error');
      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

      await compressAction('input.mp4', {});

      // expect: process.exit is called with 1
      expect(exitSpy).toHaveBeenCalledWith(1);
    });
  });

  // describe: speedupAction
  describe('speedupAction', () => {
    // it: should exit when dependencies missing
    it('should exit when dependencies missing', async () => {
      const { checkDependencies } = await import('../src/utils/dependencies.js');
      vi.mocked(checkDependencies).mockResolvedValue({ ok: false, missing: ['ffmpeg'] });
      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

      await speedupAction('input.mp4', {});

      // expect: process.exit is called with 1
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    // it: should speed up video with default rate
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

      // expect: speedUpVideo is called
      expect(speedUpVideo).toHaveBeenCalled();
    });

    // it: should use provided output option
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

      // expect: speedUpVideo is called with custom output
      const callArgs = vi.mocked(speedUpVideo).mock.calls[0];
      expect(callArgs?.[1]).toBe('out_fast.mp4');
    });

    // it: should invoke progressCallback
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

      // expect: progress bar is updated
      expect(mockProgressBar.update).toHaveBeenCalledWith(80);
    });

    // it: should not update progress bar when percentage is 0
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

      // expect: progress bar update is not called
      expect(mockProgressBar.update).not.toHaveBeenCalled();
    });

    // it: should not log faster or slower when rate is 1
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

      // expect: console.log is not called with 'faster' or 'slower'
      const consoleCalls = vi.mocked(console.log).mock.calls.map((c: unknown[]) => String(c[0]));
      expect(consoleCalls.some((m: string) => m?.includes('faster'))).toBe(false);
      expect(consoleCalls.some((m: string) => m?.includes('slower'))).toBe(false);
    });

    // it: should handle errors and exit 1
    it('should handle errors and exit 1', async () => {
      const { checkDependencies } = await import('../src/utils/dependencies.js');
      const { validateFileExists } = await import('../src/utils/validations.js');
      vi.mocked(checkDependencies).mockResolvedValue({ ok: true, missing: [] });
      vi.mocked(validateFileExists).mockRejectedValue(new Error('File not found'));
      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

      await speedupAction('input.mp4', {});

      // expect: process.exit is called with 1
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    // it: should handle non-Error thrown values
    it('should handle non-Error thrown values', async () => {
      const { checkDependencies } = await import('../src/utils/dependencies.js');
      const { validateFileExists } = await import('../src/utils/validations.js');
      vi.mocked(checkDependencies).mockResolvedValue({ ok: true, missing: [] });
      vi.mocked(validateFileExists).mockRejectedValue('string error');
      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

      await speedupAction('input.mp4', {});

      // expect: process.exit is called with 1
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    // it: should exit when validateSpeedRate throws error
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

      // expect: process.exit is called with 1
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    // it: should handle speedUpVideo errors and exit 1
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

      // expect: progress bar is stopped and process exits with 1
      expect(mockProgressBar.stop).toHaveBeenCalled();
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    // it: should handle non-Error thrown values in outer catch
    it('should handle non-Error thrown values in outer catch', async () => {
      const { checkDependencies } = await import('../src/utils/dependencies.js');
      vi.mocked(checkDependencies).mockRejectedValue('unknown error');
      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

      await speedupAction('input.mp4', {});

      // expect: process.exit is called with 1
      expect(exitSpy).toHaveBeenCalledWith(1);
    });
  });

  // describe: audioAction
  describe('audioAction', () => {
    // it: should exit when dependencies missing
    it('should exit when dependencies missing', async () => {
      const { checkDependencies } = await import('../src/utils/dependencies.js');
      vi.mocked(checkDependencies).mockResolvedValue({ ok: false, missing: ['ffmpeg'] });
      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

      await audioAction('input.mp4', {});

      // expect: process.exit is called with 1
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    // it: should extract audio with defaults
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

      // expect: extractAudio is called
      expect(extractAudio).toHaveBeenCalled();
    });

    // it: should use provided output, format and bitrate
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

      // expect: extractAudio is called with custom options
      const callArgs = vi.mocked(extractAudio).mock.calls[0];
      expect(callArgs?.[1]).toBe('track.wav');
      expect(callArgs?.[2]).toBe('wav');
      expect(callArgs?.[3]).toBe('320k');
    });

    // it: should handle errors and exit 1
    it('should handle errors and exit 1', async () => {
      const { checkDependencies } = await import('../src/utils/dependencies.js');
      const { validateFileExists } = await import('../src/utils/validations.js');
      vi.mocked(checkDependencies).mockResolvedValue({ ok: true, missing: [] });
      vi.mocked(validateFileExists).mockRejectedValue(new Error('File not found'));
      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

      await audioAction('input.mp4', {});

      // expect: process.exit is called with 1
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    // it: should handle non-Error thrown values
    it('should handle non-Error thrown values', async () => {
      const { checkDependencies } = await import('../src/utils/dependencies.js');
      const { validateFileExists } = await import('../src/utils/validations.js');
      vi.mocked(checkDependencies).mockResolvedValue({ ok: true, missing: [] });
      vi.mocked(validateFileExists).mockRejectedValue('string error');
      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

      await audioAction('input.mp4', {});

      // expect: process.exit is called with 1
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    // it: should exit when validateBitrate throws error
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

      // expect: process.exit is called with 1
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    // it: should handle extractAudio errors and exit 1
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

      // expect: process.exit is called with 1
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    // it: should exit when validateFormat throws error
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

      // expect: process.exit is called with 1
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    // it: should handle non-Error thrown values in outer catch
    it('should handle non-Error thrown values in outer catch', async () => {
      const { checkDependencies } = await import('../src/utils/dependencies.js');
      vi.mocked(checkDependencies).mockRejectedValue('unknown error');
      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

      await audioAction('input.mp4', {});

      // expect: process.exit is called with 1
      expect(exitSpy).toHaveBeenCalledWith(1);
    });
  });
});
