import { Command } from 'commander';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { setupSplit, splitAction, generateSplitOutputPaths, resolvePartDuration, executeSplit } from '@/commands/split';
import { ensureDependencies } from '@/utils/dependencies';
import { getVideoDuration } from '@/utils/ffmpeg';
import { log, handleError } from '@/utils/log';
import { createProgressBar } from '@/utils/progress';
import { checkAndPromptOverwrite } from '@/utils/prompt';
import { parseTimeToSeconds } from '@/utils/slice';
import { splitVideoReencode, splitVideoStreamCopy, getPresetDuration, calculateNumParts } from '@/utils/split';
import { validateFileExists } from '@/utils/validations';

vi.mock('../../utils/dependencies', () => {
  const mockCheckDependencies = vi.fn().mockResolvedValue({ ok: true, missing: [] });
  const mockEnsureDependencies = vi.fn().mockResolvedValue(true);
  return { checkDependencies: mockCheckDependencies, ensureDependencies: mockEnsureDependencies, runCommand: vi.fn() };
});

vi.mock('../../utils/slice', () => ({ parseTimeToSeconds: vi.fn() }));

vi.mock('../../utils/split', () => ({
  splitVideoReencode: vi.fn(),
  splitVideoStreamCopy: vi.fn(),
  getPresetDuration: vi.fn(),
  calculateNumParts: vi.fn(),
}));

vi.mock('../../utils/validations', () => ({ validateFileExists: vi.fn().mockResolvedValue(undefined) }));

vi.mock('../../utils/ffmpeg', () => ({ getVideoDuration: vi.fn() }));

vi.mock('../../utils/progress', () => ({
  createProgressBar: vi.fn(() => ({ start: vi.fn(), stop: vi.fn(), update: vi.fn(), render: vi.fn() })),
  createFFmpegProgressCallback: vi.fn().mockReturnValue(vi.fn()),
  formatFileSize: vi.fn(() => ({ value: 100, unit: 'MB' })),
}));

vi.mock('../../utils/log', () => ({
  log: { succeed: vi.fn(), fail: vi.fn(), info: vi.fn(), loading: vi.fn(), warn: vi.fn() },
  handleError: vi.fn(),
}));

vi.mock('fs/promises', () => ({ access: vi.fn().mockRejectedValue(new Error('File not found')) }));

vi.mock('../../utils/prompt', () => ({
  checkAndPromptOverwrite: vi.fn().mockResolvedValue(true),
  promptOverwrite: vi.fn().mockResolvedValue(true),
}));

// Tests for split command
describe('split command', () => {
  let exitSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    vi.mocked(ensureDependencies).mockResolvedValue(true);
    vi.mocked(validateFileExists).mockResolvedValue(undefined);
    vi.mocked(getVideoDuration).mockResolvedValue(120);
    vi.mocked(getPresetDuration).mockReturnValue(60);
    vi.mocked(calculateNumParts).mockReturnValue(3);
    vi.mocked(checkAndPromptOverwrite).mockResolvedValue(true);
    vi.mocked(parseTimeToSeconds).mockReturnValue(60);
    vi.mocked(splitVideoStreamCopy).mockResolvedValue(['video_001.mp4']);
    vi.mocked(splitVideoReencode).mockResolvedValue(['video_001.mp4']);
  });

  afterEach(() => {
    exitSpy.mockRestore();
  });

  // Tests for setupSplit
  describe('setupSplit', () => {
    let program: Command;

    beforeEach(() => {
      program = new Command();
    });

    // Should register split command with correct options
    it('should register split command with correct options', () => {
      setupSplit(program);
      const commands = program.commands;

      expect(commands).toHaveLength(1);
      expect(commands[0]?.name()).toBe('split');
      expect(commands[0]?.aliases()).toContain('spl');
    });

    // Should have preset option
    it('should have preset option', () => {
      setupSplit(program);
      const cmd = program.commands[0];
      const presetOption = cmd?.options.find((opt) => opt.long === '--preset');

      expect(presetOption).toBeDefined();
    });

    // Should have duration option
    it('should have duration option', () => {
      setupSplit(program);
      const cmd = program.commands[0];
      const durationOption = cmd?.options.find((opt) => opt.long === '--duration');

      expect(durationOption).toBeDefined();
    });

    // Should have fast option
    it('should have fast option', () => {
      setupSplit(program);
      const cmd = program.commands[0];
      const fastOption = cmd?.options.find((opt) => opt.long === '--fast');

      expect(fastOption).toBeDefined();
    });

    // Should have precise option
    it('should have precise option', () => {
      setupSplit(program);
      const cmd = program.commands[0];
      const preciseOption = cmd?.options.find((opt) => opt.long === '--precise');

      expect(preciseOption).toBeDefined();
    });

    // Should have codec option
    it('should have codec option', () => {
      setupSplit(program);
      const cmd = program.commands[0];
      const codecOption = cmd?.options.find((opt) => opt.long === '--codec');

      expect(codecOption).toBeDefined();
    });
  });

  // Tests for generateSplitOutputPaths
  describe('generateSplitOutputPaths', () => {
    // Should generate padded output paths
    it('should generate padded output paths', () => {
      const paths = generateSplitOutputPaths('video.mp4', 3);

      expect(paths).toEqual(['./video_001.mp4', './video_002.mp4', './video_003.mp4']);
    });

    // Should preserve directory and extension
    it('should preserve directory and extension', () => {
      const paths = generateSplitOutputPaths('/videos/my_clip.mkv', 2);

      expect(paths).toEqual(['/videos/my_clip_001.mkv', '/videos/my_clip_002.mkv']);
    });

    // Should default to mp4 extension when input has no extension
    it('should default to mp4 extension when input has no extension', () => {
      const paths = generateSplitOutputPaths('video', 1);

      expect(paths).toEqual(['./video_001.mp4']);
    });
  });

  // Tests for resolvePartDuration
  describe('resolvePartDuration', () => {
    // Should return preset duration for preset option
    it('should return preset duration for preset option', () => {
      const result = resolvePartDuration({ preset: 'ig' });

      expect(getPresetDuration).toHaveBeenCalledWith('ig');
      expect(result).toBe(60);
    });

    // Should return duration for duration option
    it('should return duration for duration option', () => {
      const result = resolvePartDuration({ duration: '60' });

      expect(parseTimeToSeconds).toHaveBeenCalledWith('60');
      expect(result).toBe(60);
    });

    // Should log fail and exit when both preset and duration are provided
    it('should log fail and exit when both preset and duration are provided', () => {
      resolvePartDuration({ preset: 'ig', duration: '60' });

      expect(log.fail).toHaveBeenCalledWith('Cannot use both --preset and --duration. Please choose one.');
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    // Should log fail and exit when neither preset nor duration is provided
    it('should log fail and exit when neither preset nor duration is provided', () => {
      resolvePartDuration({});

      expect(log.fail).toHaveBeenCalledWith('Please provide either --preset or --duration option.');
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    // Should log fail and exit for non-positive duration
    it('should log fail and exit for non-positive duration', () => {
      vi.mocked(parseTimeToSeconds).mockReturnValue(0);

      resolvePartDuration({ duration: '60' });

      expect(log.fail).toHaveBeenCalledWith('Duration must be greater than 0.');
      expect(exitSpy).toHaveBeenCalledWith(1);
    });
  });

  // Tests for executeSplit
  describe('executeSplit', () => {
    const outputPaths = ['./video_001.mp4', './video_002.mp4'];

    // Should split with stream copy in fast mode
    it('should split with stream copy in fast mode', async () => {
      await executeSplit('video.mp4', outputPaths, 60, 120, { fast: true });

      expect(log.succeed).toHaveBeenCalledWith('Split started | 2 parts | Max: 60s | Mode: fast');
      expect(splitVideoStreamCopy).toHaveBeenCalledWith('video.mp4', outputPaths, 60, 120, expect.any(Function));
      expect(splitVideoReencode).not.toHaveBeenCalled();
      expect(log.succeed).toHaveBeenCalledWith('Split completed successfully!');
      expect(log.info).toHaveBeenCalledTimes(2);
    });

    // Should split with re-encode and h264 by default in precise mode
    it('should split with re-encode and h264 by default in precise mode', async () => {
      await executeSplit('video.mp4', outputPaths, 60, 120, {});

      expect(log.succeed).toHaveBeenCalledWith('Split started | 2 parts | Max: 60s | Mode: precise');
      expect(splitVideoReencode).toHaveBeenCalledWith(
        'video.mp4',
        outputPaths,
        60,
        120,
        'h264',
        23,
        expect.any(Function)
      );
      expect(splitVideoStreamCopy).not.toHaveBeenCalled();
    });

    // Should split with hevc codec when codec is hevc
    it('should split with hevc codec when codec is hevc', async () => {
      await executeSplit('video.mp4', outputPaths, 60, 120, { codec: 'hevc' });

      expect(splitVideoReencode).toHaveBeenCalledWith(
        'video.mp4',
        outputPaths,
        60,
        120,
        'hevc',
        23,
        expect.any(Function)
      );
    });

    // Should call handleError when split fails
    it('should call handleError when split fails', async () => {
      vi.mocked(splitVideoStreamCopy).mockRejectedValue(new Error('Split error'));

      await executeSplit('video.mp4', outputPaths, 60, 120, { fast: true });

      expect(handleError).toHaveBeenCalledWith(expect.any(Error), 'Split failed: ');
    });

    // Should invoke progress callback during splitting
    it('should invoke progress callback during splitting', async () => {
      const calls: number[] = [];
      vi.mocked(splitVideoStreamCopy).mockImplementation(async (_input, _paths, _part, _total, cb) => {
        cb?.(50, 1, 2);
        calls.push(50);
        return ['video_001.mp4'];
      });

      await executeSplit('video.mp4', outputPaths, 60, 120, { fast: true });

      expect(calls).toContain(50);
      expect(splitVideoStreamCopy).toHaveBeenCalledWith('video.mp4', outputPaths, 60, 120, expect.any(Function));
    });

    // Should invoke progress callback during re-encode splitting
    it('should invoke progress callback during re-encode splitting', async () => {
      const bar = { start: vi.fn(), stop: vi.fn(), update: vi.fn(), render: vi.fn() } as unknown as ReturnType<
        typeof createProgressBar
      >;
      vi.mocked(createProgressBar).mockReturnValue(bar);
      vi.mocked(splitVideoReencode).mockImplementation(async (_i, paths, _part, _total, _codec, _crf, cb) => {
        cb?.(75, 1, 2);
        return paths;
      });

      await executeSplit('video.mp4', outputPaths, 60, 120, {});

      expect(bar.update).toHaveBeenCalledWith(75, { part: 1, total: 2 });
      expect(bar.render).toHaveBeenCalled();
    });
  });

  // Tests for splitAction
  describe('splitAction', () => {
    // Should split with preset and precise mode by default
    it('should split with preset and precise mode by default', async () => {
      await splitAction('video.mp4', { preset: 'ig' });

      expect(validateFileExists).toHaveBeenCalledWith('video.mp4');
      expect(getPresetDuration).toHaveBeenCalledWith('ig');
      expect(getVideoDuration).toHaveBeenCalledWith('video.mp4');
      expect(calculateNumParts).toHaveBeenCalledWith(120, 60);
      expect(checkAndPromptOverwrite).toHaveBeenCalledWith(['./video_001.mp4', './video_002.mp4', './video_003.mp4']);
      expect(splitVideoReencode).toHaveBeenCalledWith(
        'video.mp4',
        ['./video_001.mp4', './video_002.mp4', './video_003.mp4'],
        60,
        120,
        'h264',
        23,
        expect.any(Function)
      );
    });

    // Should split with duration and fast mode
    it('should split with duration and fast mode', async () => {
      await splitAction('video.mp4', { duration: '60', fast: true });

      expect(parseTimeToSeconds).toHaveBeenCalledWith('60');
      expect(splitVideoStreamCopy).toHaveBeenCalledWith(
        'video.mp4',
        ['./video_001.mp4', './video_002.mp4', './video_003.mp4'],
        60,
        120,
        expect.any(Function)
      );
    });

    // Should skip splitting when numParts is less than or equal to 1
    it('should skip splitting when numParts is less than or equal to 1', async () => {
      vi.mocked(calculateNumParts).mockReturnValue(1);

      await splitAction('video.mp4', { preset: 'ig' });

      expect(log.info).toHaveBeenCalledWith('Video is 120s long, no splitting needed (max part: 60s).');
      expect(log.info).toHaveBeenCalledWith('Use --duration to set a smaller max part size if needed.');
      expect(checkAndPromptOverwrite).not.toHaveBeenCalled();
      expect(splitVideoReencode).not.toHaveBeenCalled();
    });

    // Should exit without splitting when overwrite is declined
    it('should exit without splitting when overwrite is declined', async () => {
      vi.mocked(checkAndPromptOverwrite).mockResolvedValue(false);
      exitSpy.mockImplementation(() => {
        throw new Error('process exit');
      });

      await splitAction('video.mp4', { preset: 'ig' });

      expect(exitSpy).toHaveBeenCalledWith(0);
      expect(splitVideoReencode).not.toHaveBeenCalled();
    });

    // Should call handleError when validateFileExists fails
    it('should call handleError when validateFileExists fails', async () => {
      vi.mocked(validateFileExists).mockRejectedValue(new Error('File not found'));

      await splitAction('video.mp4', { preset: 'ig' });

      expect(handleError).toHaveBeenCalledWith(expect.any(Error));
    });

    // Should call handleError when ensureDependencies fails
    it('should call handleError when ensureDependencies fails', async () => {
      vi.mocked(ensureDependencies).mockRejectedValue(new Error('Missing dependencies'));

      await splitAction('video.mp4', { preset: 'ig' });

      expect(handleError).toHaveBeenCalledWith(expect.any(Error));
      expect(validateFileExists).not.toHaveBeenCalled();
    });

    // Should call handleError when getVideoDuration fails
    it('should call handleError when getVideoDuration fails', async () => {
      vi.mocked(getVideoDuration).mockRejectedValue(new Error('Duration error'));

      await splitAction('video.mp4', { preset: 'ig' });

      expect(handleError).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  // Tests for parseAsync integration
  describe('parseAsync integration', () => {
    let program: Command;

    beforeEach(() => {
      program = new Command();
      setupSplit(program);
    });

    // Should parse split command with preset option
    it('should parse split command with preset option', async () => {
      await program.parseAsync(['split', 'video.mp4', '--preset', 'ig'], { from: 'user' });

      expect(splitVideoReencode).toHaveBeenCalledWith(
        'video.mp4',
        ['./video_001.mp4', './video_002.mp4', './video_003.mp4'],
        60,
        120,
        'h264',
        23,
        expect.any(Function)
      );
    });

    // Should parse split command with duration and fast options
    it('should parse split command with duration and fast options', async () => {
      await program.parseAsync(['split', 'video.mp4', '--duration', '60', '--fast'], { from: 'user' });

      expect(splitVideoStreamCopy).toHaveBeenCalledWith(
        'video.mp4',
        ['./video_001.mp4', './video_002.mp4', './video_003.mp4'],
        60,
        120,
        expect.any(Function)
      );
    });
  });
});
