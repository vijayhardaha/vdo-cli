import { describe, it, expect, vi, beforeEach } from 'vitest';
import { downloadAction } from '../src/commands/download.js';
import { convertAction } from '../src/commands/convert.js';
import { compressAction } from '../src/commands/compress.js';
import { speedupAction } from '../src/commands/speedup.js';
import { audioAction } from '../src/commands/audio.js';
import { autoAction } from '../src/commands/auto.js';

// Mock all external dependencies
vi.mock('../src/utils/dependencies.js', () => ({
  checkDependencies: vi.fn(),
}));

vi.mock('../src/utils/ytdlp.js', () => ({
  downloadVideo: vi.fn(),
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
  convertToMB: vi.fn(),
}));

vi.mock('ora', () => ({
  default: vi.fn(() => ({
    start: vi.fn().mockReturnThis(),
    succeed: vi.fn().mockReturnThis(),
    fail: vi.fn().mockReturnThis(),
    text: '',
  })),
}));

vi.mock('fs/promises', () => ({
  access: vi.fn(),
}));

const mockProgressBar = {
  start: vi.fn(),
  stop: vi.fn(),
  update: vi.fn(),
};

describe('Command actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // -----------------------------------------------------------------------
  // downloadAction
  // -----------------------------------------------------------------------
  describe('downloadAction', () => {
    it('should exit with error when dependencies missing', async () => {
      const { checkDependencies } = await import('../src/utils/dependencies.js');
      vi.mocked(checkDependencies).mockResolvedValue({ ok: false, missing: ['ffmpeg'] });
      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

      await downloadAction('https://example.com', {});

      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    it('should exit with error when URL is invalid', async () => {
      const { checkDependencies } = await import('../src/utils/dependencies.js');
      const { validateUrl } = await import('../src/utils/validations.js');
      vi.mocked(checkDependencies).mockResolvedValue({ ok: true, missing: [] });
      vi.mocked(validateUrl).mockReturnValue(false);
      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

      await downloadAction('not-a-url', {});

      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    it('should download video with default options', async () => {
      const { checkDependencies } = await import('../src/utils/dependencies.js');
      const { validateUrl, validateFormat } = await import('../src/utils/validations.js');
      const { downloadVideo } = await import('../src/utils/ytdlp.js');
      const { createProgressBar, convertToMB } = await import('../src/utils/progress.js');

      vi.mocked(checkDependencies).mockResolvedValue({ ok: true, missing: [] });
      vi.mocked(validateUrl).mockReturnValue(true);
      vi.mocked(validateFormat).mockReturnValue(undefined);
      vi.mocked(downloadVideo).mockResolvedValue(undefined);
      vi.mocked(createProgressBar).mockReturnValue(mockProgressBar as never);
      vi.mocked(convertToMB).mockReturnValue(50);

      await downloadAction('https://example.com/video', {});

      expect(downloadVideo).toHaveBeenCalled();
    });

    it('should use provided output and format options', async () => {
      const { checkDependencies } = await import('../src/utils/dependencies.js');
      const { validateUrl, validateFormat } = await import('../src/utils/validations.js');
      const { downloadVideo } = await import('../src/utils/ytdlp.js');
      const { createProgressBar } = await import('../src/utils/progress.js');

      vi.mocked(checkDependencies).mockResolvedValue({ ok: true, missing: [] });
      vi.mocked(validateUrl).mockReturnValue(true);
      vi.mocked(validateFormat).mockReturnValue(undefined);
      vi.mocked(downloadVideo).mockResolvedValue(undefined);
      vi.mocked(createProgressBar).mockReturnValue(mockProgressBar as never);

      await downloadAction('https://example.com', { output: 'myvideo', format: 'mkv' });

      const callArgs = vi.mocked(downloadVideo).mock.calls[0];
      expect(callArgs?.[1]).toBe('myvideo.mkv');
      expect(callArgs?.[2]).toBe('mkv');
    });

    it('should append extension when output has no dot', async () => {
      const { checkDependencies } = await import('../src/utils/dependencies.js');
      const { validateUrl, validateFormat } = await import('../src/utils/validations.js');
      const { downloadVideo } = await import('../src/utils/ytdlp.js');
      const { createProgressBar } = await import('../src/utils/progress.js');

      vi.mocked(checkDependencies).mockResolvedValue({ ok: true, missing: [] });
      vi.mocked(validateUrl).mockReturnValue(true);
      vi.mocked(validateFormat).mockReturnValue(undefined);
      vi.mocked(downloadVideo).mockResolvedValue(undefined);
      vi.mocked(createProgressBar).mockReturnValue(mockProgressBar as never);

      await downloadAction('https://example.com', { output: 'myvideo', format: 'mp3' });

      const callArgs = vi.mocked(downloadVideo).mock.calls[0];
      expect(callArgs?.[1]).toBe('myvideo.mp3');
    });

    it('should call progressCallback and update progress bar', async () => {
      const { checkDependencies } = await import('../src/utils/dependencies.js');
      const { validateUrl, validateFormat } = await import('../src/utils/validations.js');
      const { downloadVideo } = await import('../src/utils/ytdlp.js');
      const { createProgressBar, convertToMB } = await import('../src/utils/progress.js');

      vi.mocked(checkDependencies).mockResolvedValue({ ok: true, missing: [] });
      vi.mocked(validateUrl).mockReturnValue(true);
      vi.mocked(validateFormat).mockReturnValue(undefined);
      vi.mocked(convertToMB).mockReturnValue(100);
      vi.mocked(createProgressBar).mockReturnValue(mockProgressBar as never);
      vi.mocked(downloadVideo).mockImplementation(async (_url, _out, _fmt, onProgress) => {
        if (onProgress) onProgress(50, 100, 'MiB');
      });

      await downloadAction('https://example.com', {});

      expect(mockProgressBar.update).toHaveBeenCalled();
    });

    it('should handle thrown errors and exit 1', async () => {
      const { checkDependencies } = await import('../src/utils/dependencies.js');
      const { validateUrl, validateFormat } = await import('../src/utils/validations.js');
      const { downloadVideo } = await import('../src/utils/ytdlp.js');
      const { createProgressBar } = await import('../src/utils/progress.js');

      vi.mocked(checkDependencies).mockResolvedValue({ ok: true, missing: [] });
      vi.mocked(validateUrl).mockReturnValue(true);
      vi.mocked(validateFormat).mockReturnValue(undefined);
      vi.mocked(createProgressBar).mockReturnValue(mockProgressBar as never);
      vi.mocked(downloadVideo).mockRejectedValue(new Error('network error'));
      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

      await downloadAction('https://example.com', {});

      expect(exitSpy).toHaveBeenCalledWith(1);
    });
  });

  // -----------------------------------------------------------------------
  // convertAction
  // -----------------------------------------------------------------------
  describe('convertAction', () => {
    it('should exit when dependencies missing', async () => {
      const { checkDependencies } = await import('../src/utils/dependencies.js');
      vi.mocked(checkDependencies).mockResolvedValue({ ok: false, missing: ['ffmpeg'] });
      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

      await convertAction('input.avi', {});

      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    it('should convert video with default options', async () => {
      const { checkDependencies } = await import('../src/utils/dependencies.js');
      const { validateFileExists, validateFormat, validatePreset } =
        await import('../src/utils/validations.js');
      const { convertVideo } = await import('../src/utils/ffmpeg.js');
      const { createProgressBar } = await import('../src/utils/progress.js');

      vi.mocked(checkDependencies).mockResolvedValue({ ok: true, missing: [] });
      vi.mocked(validateFileExists).mockResolvedValue(undefined);
      vi.mocked(validateFormat).mockReturnValue(undefined);
      vi.mocked(validatePreset).mockReturnValue(undefined);
      vi.mocked(convertVideo).mockResolvedValue(undefined);
      vi.mocked(createProgressBar).mockReturnValue(mockProgressBar as never);

      await convertAction('input.avi', {});

      expect(convertVideo).toHaveBeenCalled();
    });

    it('should use provided output option', async () => {
      const { checkDependencies } = await import('../src/utils/dependencies.js');
      const { validateFileExists, validateFormat, validatePreset } =
        await import('../src/utils/validations.js');
      const { convertVideo } = await import('../src/utils/ffmpeg.js');
      const { createProgressBar } = await import('../src/utils/progress.js');

      vi.mocked(checkDependencies).mockResolvedValue({ ok: true, missing: [] });
      vi.mocked(validateFileExists).mockResolvedValue(undefined);
      vi.mocked(validateFormat).mockReturnValue(undefined);
      vi.mocked(validatePreset).mockReturnValue(undefined);
      vi.mocked(convertVideo).mockResolvedValue(undefined);
      vi.mocked(createProgressBar).mockReturnValue(mockProgressBar as never);

      await convertAction('input.avi', { output: 'custom_out.mp4', to: 'mp4', preset: 'slow' });

      const callArgs = vi.mocked(convertVideo).mock.calls[0];
      expect(callArgs?.[1]).toBe('custom_out.mp4');
    });

    it('should invoke progressCallback', async () => {
      const { checkDependencies } = await import('../src/utils/dependencies.js');
      const { validateFileExists, validateFormat, validatePreset } =
        await import('../src/utils/validations.js');
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

      expect(mockProgressBar.update).toHaveBeenCalledWith(50);
    });

    it('should handle errors and exit 1', async () => {
      const { checkDependencies } = await import('../src/utils/dependencies.js');
      const { validateFileExists } = await import('../src/utils/validations.js');
      vi.mocked(checkDependencies).mockResolvedValue({ ok: true, missing: [] });
      vi.mocked(validateFileExists).mockRejectedValue(new Error('File not found: input.avi'));
      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

      await convertAction('input.avi', {});

      expect(exitSpy).toHaveBeenCalledWith(1);
    });
  });

  // -----------------------------------------------------------------------
  // compressAction
  // -----------------------------------------------------------------------
  describe('compressAction', () => {
    it('should exit when dependencies missing', async () => {
      const { checkDependencies } = await import('../src/utils/dependencies.js');
      vi.mocked(checkDependencies).mockResolvedValue({ ok: false, missing: ['ffmpeg'] });
      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

      await compressAction('input.mp4', {});

      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    it('should compress video with default options', async () => {
      const { checkDependencies } = await import('../src/utils/dependencies.js');
      const { validateFileExists, validatePreset, validateCRF } =
        await import('../src/utils/validations.js');
      const { compressVideo } = await import('../src/utils/ffmpeg.js');
      const { createProgressBar } = await import('../src/utils/progress.js');

      vi.mocked(checkDependencies).mockResolvedValue({ ok: true, missing: [] });
      vi.mocked(validateFileExists).mockResolvedValue(undefined);
      vi.mocked(validatePreset).mockReturnValue(undefined);
      vi.mocked(validateCRF).mockReturnValue(undefined);
      vi.mocked(compressVideo).mockResolvedValue(undefined);
      vi.mocked(createProgressBar).mockReturnValue(mockProgressBar as never);

      await compressAction('input.mp4', {});

      expect(compressVideo).toHaveBeenCalled();
    });

    it('should use provided output option', async () => {
      const { checkDependencies } = await import('../src/utils/dependencies.js');
      const { validateFileExists, validatePreset, validateCRF } =
        await import('../src/utils/validations.js');
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
      expect(callArgs?.[1]).toBe('small.mp4');
      expect(callArgs?.[2]).toBe(23);
    });

    it('should invoke progressCallback', async () => {
      const { checkDependencies } = await import('../src/utils/dependencies.js');
      const { validateFileExists, validatePreset, validateCRF } =
        await import('../src/utils/validations.js');
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

      expect(mockProgressBar.update).toHaveBeenCalledWith(75);
    });

    it('should handle errors and exit 1', async () => {
      const { checkDependencies } = await import('../src/utils/dependencies.js');
      const { validateFileExists } = await import('../src/utils/validations.js');
      vi.mocked(checkDependencies).mockResolvedValue({ ok: true, missing: [] });
      vi.mocked(validateFileExists).mockRejectedValue(new Error('File not found'));
      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

      await compressAction('input.mp4', {});

      expect(exitSpy).toHaveBeenCalledWith(1);
    });
  });

  // -----------------------------------------------------------------------
  // speedupAction
  // -----------------------------------------------------------------------
  describe('speedupAction', () => {
    it('should exit when dependencies missing', async () => {
      const { checkDependencies } = await import('../src/utils/dependencies.js');
      vi.mocked(checkDependencies).mockResolvedValue({ ok: false, missing: ['ffmpeg'] });
      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

      await speedupAction('input.mp4', {});

      expect(exitSpy).toHaveBeenCalledWith(1);
    });

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

      expect(speedUpVideo).toHaveBeenCalled();
    });

    it('should log faster message when rate > 1', async () => {
      const { checkDependencies } = await import('../src/utils/dependencies.js');
      const { validateFileExists, validateSpeedRate } = await import('../src/utils/validations.js');
      const { speedUpVideo } = await import('../src/utils/ffmpeg.js');
      const { createProgressBar } = await import('../src/utils/progress.js');

      vi.mocked(checkDependencies).mockResolvedValue({ ok: true, missing: [] });
      vi.mocked(validateFileExists).mockResolvedValue(undefined);
      vi.mocked(validateSpeedRate).mockReturnValue(undefined);
      vi.mocked(speedUpVideo).mockResolvedValue(undefined);
      vi.mocked(createProgressBar).mockReturnValue(mockProgressBar as never);

      await speedupAction('input.mp4', { rate: 2 });

      expect(vi.mocked(console.log)).toHaveBeenCalledWith(expect.stringContaining('faster'));
    });

    it('should log slower message when rate < 1', async () => {
      const { checkDependencies } = await import('../src/utils/dependencies.js');
      const { validateFileExists, validateSpeedRate } = await import('../src/utils/validations.js');
      const { speedUpVideo } = await import('../src/utils/ffmpeg.js');
      const { createProgressBar } = await import('../src/utils/progress.js');

      vi.mocked(checkDependencies).mockResolvedValue({ ok: true, missing: [] });
      vi.mocked(validateFileExists).mockResolvedValue(undefined);
      vi.mocked(validateSpeedRate).mockReturnValue(undefined);
      vi.mocked(speedUpVideo).mockResolvedValue(undefined);
      vi.mocked(createProgressBar).mockReturnValue(mockProgressBar as never);

      await speedupAction('input.mp4', { rate: 0.5 });

      expect(vi.mocked(console.log)).toHaveBeenCalledWith(expect.stringContaining('slower'));
    });

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

      const callArgs = vi.mocked(speedUpVideo).mock.calls[0];
      expect(callArgs?.[1]).toBe('out_fast.mp4');
    });

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

      expect(mockProgressBar.update).toHaveBeenCalledWith(80);
    });

    it('should handle errors and exit 1', async () => {
      const { checkDependencies } = await import('../src/utils/dependencies.js');
      const { validateFileExists } = await import('../src/utils/validations.js');
      vi.mocked(checkDependencies).mockResolvedValue({ ok: true, missing: [] });
      vi.mocked(validateFileExists).mockRejectedValue(new Error('File not found'));
      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

      await speedupAction('input.mp4', {});

      expect(exitSpy).toHaveBeenCalledWith(1);
    });
  });

  // -----------------------------------------------------------------------
  // audioAction
  // -----------------------------------------------------------------------
  describe('audioAction', () => {
    it('should exit when dependencies missing', async () => {
      const { checkDependencies } = await import('../src/utils/dependencies.js');
      vi.mocked(checkDependencies).mockResolvedValue({ ok: false, missing: ['ffmpeg'] });
      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

      await audioAction('input.mp4', {});

      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    it('should extract audio with defaults', async () => {
      const { checkDependencies } = await import('../src/utils/dependencies.js');
      const { validateFileExists, validateFormat, validateBitrate } =
        await import('../src/utils/validations.js');
      const { extractAudio } = await import('../src/utils/ffmpeg.js');

      vi.mocked(checkDependencies).mockResolvedValue({ ok: true, missing: [] });
      vi.mocked(validateFileExists).mockResolvedValue(undefined);
      vi.mocked(validateFormat).mockReturnValue(undefined);
      vi.mocked(validateBitrate).mockReturnValue(undefined);
      vi.mocked(extractAudio).mockResolvedValue(undefined);

      await audioAction('input.mp4', {});

      expect(extractAudio).toHaveBeenCalled();
    });

    it('should use provided output, format and bitrate', async () => {
      const { checkDependencies } = await import('../src/utils/dependencies.js');
      const { validateFileExists, validateFormat, validateBitrate } =
        await import('../src/utils/validations.js');
      const { extractAudio } = await import('../src/utils/ffmpeg.js');

      vi.mocked(checkDependencies).mockResolvedValue({ ok: true, missing: [] });
      vi.mocked(validateFileExists).mockResolvedValue(undefined);
      vi.mocked(validateFormat).mockReturnValue(undefined);
      vi.mocked(validateBitrate).mockReturnValue(undefined);
      vi.mocked(extractAudio).mockResolvedValue(undefined);

      await audioAction('input.mp4', { output: 'track.wav', format: 'wav', bitrate: '320k' });

      const callArgs = vi.mocked(extractAudio).mock.calls[0];
      expect(callArgs?.[1]).toBe('track.wav');
      expect(callArgs?.[2]).toBe('wav');
      expect(callArgs?.[3]).toBe('320k');
    });

    it('should handle errors and exit 1', async () => {
      const { checkDependencies } = await import('../src/utils/dependencies.js');
      const { validateFileExists } = await import('../src/utils/validations.js');
      vi.mocked(checkDependencies).mockResolvedValue({ ok: true, missing: [] });
      vi.mocked(validateFileExists).mockRejectedValue(new Error('File not found'));
      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

      await audioAction('input.mp4', {});

      expect(exitSpy).toHaveBeenCalledWith(1);
    });
  });

  // -----------------------------------------------------------------------
  // autoAction
  // -----------------------------------------------------------------------
  describe('autoAction', () => {
    it('should exit when dependencies missing', async () => {
      const { checkDependencies } = await import('../src/utils/dependencies.js');
      vi.mocked(checkDependencies).mockResolvedValue({ ok: false, missing: ['ffmpeg'] });
      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

      await autoAction('https://example.com', {});

      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    it('should download when input is URL', async () => {
      const { checkDependencies } = await import('../src/utils/dependencies.js');
      const { validateUrl } = await import('../src/utils/validations.js');
      const { downloadVideo } = await import('../src/utils/ytdlp.js');
      const { createProgressBar } = await import('../src/utils/progress.js');

      vi.mocked(checkDependencies).mockResolvedValue({ ok: true, missing: [] });
      vi.mocked(validateUrl).mockReturnValue(true);
      vi.mocked(downloadVideo).mockResolvedValue(undefined);
      vi.mocked(createProgressBar).mockReturnValue(mockProgressBar as never);

      await autoAction('https://example.com', {});

      expect(downloadVideo).toHaveBeenCalled();
    });

    it('should use format and output options for URL download', async () => {
      const { checkDependencies } = await import('../src/utils/dependencies.js');
      const { validateUrl } = await import('../src/utils/validations.js');
      const { downloadVideo } = await import('../src/utils/ytdlp.js');
      const { createProgressBar } = await import('../src/utils/progress.js');

      vi.mocked(checkDependencies).mockResolvedValue({ ok: true, missing: [] });
      vi.mocked(validateUrl).mockReturnValue(true);
      vi.mocked(downloadVideo).mockResolvedValue(undefined);
      vi.mocked(createProgressBar).mockReturnValue(mockProgressBar as never);

      await autoAction('https://example.com', { output: 'video.mkv', format: 'mkv' });

      const callArgs = vi.mocked(downloadVideo).mock.calls[0];
      expect(callArgs?.[1]).toBe('video.mkv');
      expect(callArgs?.[2]).toBe('mkv');
    });

    it('should invoke progress callback for URL download', async () => {
      const { checkDependencies } = await import('../src/utils/dependencies.js');
      const { validateUrl } = await import('../src/utils/validations.js');
      const { downloadVideo } = await import('../src/utils/ytdlp.js');
      const { createProgressBar } = await import('../src/utils/progress.js');

      vi.mocked(checkDependencies).mockResolvedValue({ ok: true, missing: [] });
      vi.mocked(validateUrl).mockReturnValue(true);
      vi.mocked(createProgressBar).mockReturnValue(mockProgressBar as never);
      vi.mocked(downloadVideo).mockImplementation(async (_u, _o, _f, onProgress) => {
        if (onProgress) {
          onProgress(50, 100, 'MiB');
          onProgress(50, 100, 'KiB');
          onProgress(50, 100, 'GiB');
        }
      });

      await autoAction('https://example.com', {});

      expect(mockProgressBar.update).toHaveBeenCalled();
    });

    it('should convert local file when input is existing file', async () => {
      const { checkDependencies } = await import('../src/utils/dependencies.js');
      const { validateUrl } = await import('../src/utils/validations.js');
      const { convertVideo } = await import('../src/utils/ffmpeg.js');
      const { createProgressBar } = await import('../src/utils/progress.js');
      const fs = await import('fs/promises');

      vi.mocked(checkDependencies).mockResolvedValue({ ok: true, missing: [] });
      vi.mocked(validateUrl).mockReturnValue(false);
      vi.mocked(fs.access).mockResolvedValue(undefined);
      vi.mocked(convertVideo).mockResolvedValue(undefined);
      vi.mocked(createProgressBar).mockReturnValue(mockProgressBar as never);

      await autoAction('local.avi', {});

      expect(convertVideo).toHaveBeenCalled();
    });

    it('should use output option for local file conversion', async () => {
      const { checkDependencies } = await import('../src/utils/dependencies.js');
      const { validateUrl } = await import('../src/utils/validations.js');
      const { convertVideo } = await import('../src/utils/ffmpeg.js');
      const { createProgressBar } = await import('../src/utils/progress.js');
      const fs = await import('fs/promises');

      vi.mocked(checkDependencies).mockResolvedValue({ ok: true, missing: [] });
      vi.mocked(validateUrl).mockReturnValue(false);
      vi.mocked(fs.access).mockResolvedValue(undefined);
      vi.mocked(convertVideo).mockResolvedValue(undefined);
      vi.mocked(createProgressBar).mockReturnValue(mockProgressBar as never);

      await autoAction('local.avi', { output: 'custom_output.mp4' });

      const callArgs = vi.mocked(convertVideo).mock.calls[0];
      expect(callArgs?.[1]).toBe('custom_output.mp4');
    });

    it('should invoke progress callback for local file conversion', async () => {
      const { checkDependencies } = await import('../src/utils/dependencies.js');
      const { validateUrl } = await import('../src/utils/validations.js');
      const { convertVideo } = await import('../src/utils/ffmpeg.js');
      const { createProgressBar } = await import('../src/utils/progress.js');
      const fs = await import('fs/promises');

      vi.mocked(checkDependencies).mockResolvedValue({ ok: true, missing: [] });
      vi.mocked(validateUrl).mockReturnValue(false);
      vi.mocked(fs.access).mockResolvedValue(undefined);
      vi.mocked(createProgressBar).mockReturnValue(mockProgressBar as never);
      vi.mocked(convertVideo).mockImplementation(async (_i, _o, _f, _p, onProgress) => {
        if (onProgress) onProgress(60, 36, 60);
      });

      await autoAction('local.avi', {});

      expect(mockProgressBar.update).toHaveBeenCalledWith(60);
    });

    it('should exit when input is neither URL nor existing file', async () => {
      const { checkDependencies } = await import('../src/utils/dependencies.js');
      const { validateUrl } = await import('../src/utils/validations.js');
      const fs = await import('fs/promises');

      vi.mocked(checkDependencies).mockResolvedValue({ ok: true, missing: [] });
      vi.mocked(validateUrl).mockReturnValue(false);
      vi.mocked(fs.access).mockRejectedValue(new Error('ENOENT'));
      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

      await autoAction('nonexistent.avi', {});

      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    it('should handle errors and exit 1', async () => {
      const { checkDependencies } = await import('../src/utils/dependencies.js');
      const { validateUrl } = await import('../src/utils/validations.js');
      const { downloadVideo } = await import('../src/utils/ytdlp.js');
      const { createProgressBar } = await import('../src/utils/progress.js');

      vi.mocked(checkDependencies).mockResolvedValue({ ok: true, missing: [] });
      vi.mocked(validateUrl).mockReturnValue(true);
      vi.mocked(createProgressBar).mockReturnValue(mockProgressBar as never);
      vi.mocked(downloadVideo).mockRejectedValue(new Error('download failed'));
      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

      await autoAction('https://example.com', {});

      expect(exitSpy).toHaveBeenCalledWith(1);
    });
  });
});
