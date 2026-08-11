import { rename, unlink } from 'fs/promises';

import { Command } from 'commander';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import {
  setupDownload,
  resolveDownloadTarget,
  downloadAction,
  handlePostDownload,
  handleConvert,
  handleSplit,
} from '@/commands/download';
import { splitAction } from '@/commands/split';
import { ensureDependencies } from '@/utils/dependencies';
import { convertVideo, getVideoDuration } from '@/utils/ffmpeg';
import { log, handleError } from '@/utils/log';
import { createProgressBar } from '@/utils/progress';
import { checkAndPromptOverwrite } from '@/utils/prompt';
import { parseSplitValue, getPresetDuration, calculateNumParts } from '@/utils/split';
import { validateUrl, validateFormat } from '@/utils/validations';
import { downloadVideo, getVideoInfo, generateFilename } from '@/utils/ytdlp';

/* Shared video info returned by mocked getVideoInfo */
const mockVideoInfo = { title: 'Test Title', video_id: 'vid123', ext: 'mp4', filesize: 1000000 };

vi.mock('../../utils/dependencies', () => {
  const mockCheckDependencies = vi.fn().mockResolvedValue({ ok: true, missing: [] });
  const mockEnsureDependencies = vi.fn().mockResolvedValue(true);
  return { checkDependencies: mockCheckDependencies, ensureDependencies: mockEnsureDependencies, runCommand: vi.fn() };
});

vi.mock('../../utils/ytdlp', () => ({
  downloadVideo: vi.fn(),
  getVideoInfo: vi.fn(),
  generateFilename: vi.fn((info, format) => `${info.title}_${info.video_id}.${format}`),
}));

vi.mock('../../utils/ffmpeg', () => ({ convertVideo: vi.fn(), getVideoDuration: vi.fn() }));

vi.mock('../../utils/progress', () => ({
  createProgressBar: vi.fn(() => ({ start: vi.fn(), stop: vi.fn(), update: vi.fn(), render: vi.fn() })),
  createProgressCallback: vi.fn().mockReturnValue(vi.fn()),
  formatFileSize: vi.fn(() => ({ value: 100, unit: 'MB' })),
}));

vi.mock('../../utils/validations', () => ({ validateUrl: vi.fn(), validateFormat: vi.fn() }));

vi.mock('../../utils/log', () => ({
  log: { succeed: vi.fn(), fail: vi.fn(), info: vi.fn(), loading: vi.fn(), warn: vi.fn() },
  handleError: vi.fn(),
}));

vi.mock('fs/promises', () => ({
  access: vi.fn().mockRejectedValue(new Error('File not found')),
  rename: vi.fn(),
  unlink: vi.fn(),
}));

vi.mock('../../utils/prompt', () => ({
  checkAndPromptOverwrite: vi.fn().mockResolvedValue(true),
  promptOverwrite: vi.fn().mockResolvedValue(true),
}));

vi.mock('../../utils/split', () => ({
  parseSplitValue: vi.fn(),
  getPresetDuration: vi.fn(),
  calculateNumParts: vi.fn(),
}));

vi.mock('../split', () => ({ splitAction: vi.fn() }));

// Tests for download command
describe('download command', () => {
  let exitSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    vi.mocked(ensureDependencies).mockResolvedValue(true);
    vi.mocked(validateUrl).mockReturnValue(true);
    vi.mocked(validateFormat).mockReturnValue(undefined);
    vi.mocked(getVideoInfo).mockResolvedValue(mockVideoInfo);
    vi.mocked(generateFilename).mockReturnValue('test_123.mp4');
    vi.mocked(checkAndPromptOverwrite).mockResolvedValue(true);
    vi.mocked(downloadVideo).mockResolvedValue(undefined);
    vi.mocked(convertVideo).mockResolvedValue(undefined);
    vi.mocked(rename).mockResolvedValue(undefined);
    vi.mocked(unlink).mockResolvedValue(undefined);
    vi.mocked(getVideoDuration).mockResolvedValue(120);
    vi.mocked(parseSplitValue).mockReturnValue({ type: 'preset', value: 'ig' });
    vi.mocked(getPresetDuration).mockReturnValue(60);
    vi.mocked(calculateNumParts).mockReturnValue(2);
    vi.mocked(splitAction).mockResolvedValue(undefined);
  });

  afterEach(() => {
    exitSpy.mockRestore();
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
      expect(commands[0]?.options).toHaveLength(5);
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

    // Should have cookies option
    it('should have cookies option', () => {
      setupDownload(program);
      const cmd = program.commands[0];
      const cookiesOption = cmd?.options.find((opt) => opt.long === '--cookies');

      expect(cookiesOption).toBeDefined();
      expect(cookiesOption?.flags).toContain('--cookies <browser>');
    });

    // Should register download command with 5 options (including new cookies option)
    it('should register download command with correct number of options', () => {
      setupDownload(program);
      const commands = program.commands;

      expect(commands).toHaveLength(1);
      expect(commands[0]?.options).toHaveLength(5);
    });
  });

  // Tests for resolveDownloadTarget
  describe('resolveDownloadTarget', () => {
    // Should resolve download target for valid URL
    it('should resolve download target for valid URL', async () => {
      const url = 'https://example.com/video';
      const result = await resolveDownloadTarget(url, {});

      // Expect URL is validated
      expect(validateUrl).toHaveBeenCalledWith(url);

      // Expect format defaults to mp4
      expect(validateFormat).toHaveBeenCalledWith('mp4', ['mp4', 'mkv', 'webm', 'avi', 'mov', 'mp3']);

      // Expect video info is fetched and filename generated
      expect(getVideoInfo).toHaveBeenCalledWith(url, undefined);
      expect(generateFilename).toHaveBeenCalledWith(mockVideoInfo, 'mp4');

      // Expect output file is generated from video info
      expect(result.outputFile).toBe('test_123.mp4');
      expect(result.format).toBe('mp4');
      expect(result.videoInfo).toBe(mockVideoInfo);
    });

    // Should exit process for invalid URL
    it('should exit process for invalid URL', async () => {
      vi.mocked(validateUrl).mockReturnValue(false);

      await resolveDownloadTarget('not-a-url', {});

      // Expect failure is logged and process exits
      expect(log.fail).toHaveBeenCalledWith(expect.stringContaining('Invalid URL'));
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    // Should use custom output with matching extension
    it('should use custom output with matching extension', async () => {
      const result = await resolveDownloadTarget('https://example.com/video', { output: 'custom.mp4' });

      // Expect output file uses custom path when extension matches format
      expect(result.outputFile).toBe('custom.mp4');
    });

    // Should append format extension for non-matching custom output
    it('should append format extension for non-matching custom output', async () => {
      const result = await resolveDownloadTarget('https://example.com/video', { output: 'custom.avi', format: 'mp4' });

      // Expect format extension is appended when it does not match
      expect(result.outputFile).toBe('custom.avi.mp4');
    });

    // Should call handleError when validateFormat fails
    it('should call handleError when validateFormat fails', async () => {
      vi.mocked(validateFormat).mockImplementation(() => {
        throw new Error('Invalid format');
      });

      await resolveDownloadTarget('https://example.com/video', { format: 'mkv' });

      // Expect handleError is called with the format error
      expect(handleError).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  // Tests for downloadAction
  describe('downloadAction', () => {
    // Should download video successfully with defaults
    it('should download video successfully with defaults', async () => {
      const url = 'https://example.com/video';
      await downloadAction(url, {});

      // Expect dependencies are checked and output file resolved
      expect(ensureDependencies).toHaveBeenCalled();
      expect(checkAndPromptOverwrite).toHaveBeenCalledWith(['test_123.mp4']);

      // Expect downloadVideo is called with url, output, format, callback, and cookies
      expect(downloadVideo).toHaveBeenCalledWith(url, 'test_123.mp4', 'mp4', expect.any(Function), undefined);

      // Expect success is logged
      expect(log.succeed).toHaveBeenCalledWith('Download completed successfully!');
    });

    // Should call handleError when download fails
    it('should call handleError when download fails', async () => {
      vi.mocked(downloadVideo).mockRejectedValue(new Error('Network error'));

      await downloadAction('https://example.com/video', {});

      // Expect handleError is called with the download error and prefix
      expect(handleError).toHaveBeenCalledWith(expect.any(Error), 'Download failed: ');
    });

    // Should exit without downloading when overwrite is declined
    it('should exit without downloading when overwrite is declined', async () => {
      vi.mocked(checkAndPromptOverwrite).mockResolvedValue(false);
      exitSpy.mockImplementation(() => {
        throw new Error('process exit');
      });

      await downloadAction('https://example.com/video', {});

      // Expect process exits without calling downloadVideo
      expect(exitSpy).toHaveBeenCalledWith(0);
      expect(downloadVideo).not.toHaveBeenCalled();
    });

    // Should invoke progress callback during download
    it('should invoke progress callback during download', async () => {
      const bar = { start: vi.fn(), stop: vi.fn(), update: vi.fn(), render: vi.fn() } as unknown as ReturnType<
        typeof createProgressBar
      >;
      vi.mocked(createProgressBar).mockReturnValue(bar);
      vi.mocked(downloadVideo).mockImplementation(async (_url, _output, _format, cb) => {
        cb?.(50, 0, 'MB');
      });

      await downloadAction('https://example.com/video', {});

      // Expect progress callback updated the progress bar with computed bytes
      expect(bar.update).toHaveBeenCalledWith(50, { total: 100 });
    });

    // Should call handleError when ensureDependencies fails
    it('should call handleError when ensureDependencies fails', async () => {
      vi.mocked(ensureDependencies).mockRejectedValue(new Error('Missing dependencies'));

      await downloadAction('https://example.com/video', {});

      // Expect handleError is called with the dependency error
      expect(handleError).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  // Tests for handlePostDownload
  describe('handlePostDownload', () => {
    // Should convert when convert option is set
    it('should convert when convert option is set', async () => {
      await handlePostDownload('video.mp4', 'mp4', { convert: true });

      // Expect conversion ran (rename + convertVideo) and output is logged
      expect(rename).toHaveBeenCalledWith('video.mp4', 'temp-video.mp4');
      expect(convertVideo).toHaveBeenCalled();
      expect(log.info).toHaveBeenCalled();
    });

    // Should split when split option is set
    it('should split when split option is set', async () => {
      await handlePostDownload('video.mp4', 'mp4', { split: 'ig' });

      // Expect split was delegated to splitAction
      expect(splitAction).toHaveBeenCalledWith('video.mp4', { fast: true, preset: 'ig' });

      // Expect output info is not logged when splitting
      expect(log.info).not.toHaveBeenCalled();
    });

    // Should log output when no convert or split
    it('should log output when no convert or split', async () => {
      await handlePostDownload('video.mp4', 'mp4', {});

      // Expect output info is logged
      expect(log.info).toHaveBeenCalledWith(expect.stringContaining('Output:'));
    });
  });

  // Tests for handleConvert
  describe('handleConvert', () => {
    // Should rename, convert, unlink, and return final file on success
    it('should rename, convert, unlink, and return final file on success', async () => {
      const result = await handleConvert('video.mp4', 'mkv');

      // Expect file is renamed to temp, converted, then temp is removed
      expect(rename).toHaveBeenCalledWith('video.mp4', 'temp-video.mp4');
      expect(convertVideo).toHaveBeenCalledWith('temp-video.mp4', 'video.mkv', 'mkv', 'fast', expect.any(Function));
      expect(unlink).toHaveBeenCalledWith('temp-video.mp4');

      // Expect final file path is returned
      expect(result).toBe('video.mkv');
    });

    // Should restore original file when convert fails
    it('should restore original file when convert fails', async () => {
      vi.mocked(convertVideo).mockRejectedValue(new Error('Convert error'));

      const result = await handleConvert('video.mp4', 'mkv');

      // Expect temp file is renamed back to original on conversion failure
      expect(rename).toHaveBeenCalledWith('video.mp4', 'temp-video.mp4');
      expect(rename).toHaveBeenCalledWith('temp-video.mp4', 'video.mp4');

      // Expect handleError is called with conversion prefix
      expect(handleError).toHaveBeenCalledWith(expect.any(Error), 'Conversion failed: ');

      // Expect no final file returned on failure
      expect(result).toBeUndefined();
    });

    // Should call handleError when rename fails
    it('should call handleError when rename fails', async () => {
      vi.mocked(rename).mockRejectedValue(new Error('Rename error'));

      await handleConvert('video.mp4', 'mkv');

      // Expect convertVideo is not reached
      expect(convertVideo).not.toHaveBeenCalled();

      // Expect handleError is called with conversion prefix
      expect(handleError).toHaveBeenCalledWith(expect.any(Error), 'Conversion failed: ');
    });
  });

  // Tests for handleSplit
  describe('handleSplit', () => {
    // Should split using preset mode
    it('should split using preset mode', async () => {
      await handleSplit('video.mp4', 'ig');

      // Expect splitAction is called with preset option
      expect(splitAction).toHaveBeenCalledWith('video.mp4', { fast: true, preset: 'ig' });
    });

    // Should split using duration mode
    it('should split using duration mode', async () => {
      vi.mocked(parseSplitValue).mockReturnValue({ type: 'duration', value: 60 });

      await handleSplit('video.mp4', '60');

      // Expect splitAction is called with duration option
      expect(splitAction).toHaveBeenCalledWith('video.mp4', { fast: true, duration: '60' });
    });

    // Should skip splitting when numParts is less than or equal to 1
    it('should skip splitting when numParts is less than or equal to 1', async () => {
      vi.mocked(calculateNumParts).mockReturnValue(1);

      await handleSplit('video.mp4', 'ig');

      // Expect splitAction is not called when no splitting is needed
      expect(splitAction).not.toHaveBeenCalled();

      // Expect info is logged about no splitting needed
      expect(log.info).toHaveBeenCalled();
    });

    // Should call handleError when parseSplitValue fails
    it('should call handleError when parseSplitValue fails', async () => {
      vi.mocked(parseSplitValue).mockImplementation(() => {
        throw new Error('Invalid split value');
      });

      await expect(handleSplit('video.mp4', 'ig')).rejects.toThrow();

      // Expect handleError is called with the split value error
      expect(handleError).toHaveBeenCalledWith(expect.any(Error));
    });
  });
});
