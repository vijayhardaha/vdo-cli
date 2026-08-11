import { Command } from 'commander';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import {
  setupSlice,
  sliceAction,
  formatSecondsToFilename,
  parseSegments,
  resolveTimeRange,
  validateSliceOptions,
  resolveSliceMode,
  executeSingleSlice,
  handleSingleSlice,
  handleSliceSegments,
} from '@/commands/slice';
import { ensureDependencies } from '@/utils/dependencies';
import { log, handleError } from '@/utils/log';
import { createProgressBar } from '@/utils/progress';
import { checkAndPromptOverwrite } from '@/utils/prompt';
import { parseTimeToSeconds, sliceVideoStreamCopy, sliceVideoReencode, sliceMultipleSegments } from '@/utils/slice';
import { validateFileExists } from '@/utils/validations';

vi.mock('../../utils/dependencies', () => {
  const mockCheckDependencies = vi.fn().mockResolvedValue({ ok: true, missing: [] });
  const mockEnsureDependencies = vi.fn().mockResolvedValue(true);
  return { checkDependencies: mockCheckDependencies, ensureDependencies: mockEnsureDependencies, runCommand: vi.fn() };
});

vi.mock('../../utils/output', () => ({
  resolveOutputFile: vi.fn((o) => {
    if (o.output) return o.output;
    const base = o.input.replace(/\.[^.]+$/, '');
    return `${base}${o.suffix}.mp4`;
  }),
}));

vi.mock('../../utils/slice', () => ({
  parseTimeToSeconds: vi.fn((t) => parseFloat(t)),
  sliceVideoStreamCopy: vi.fn(),
  sliceVideoReencode: vi.fn(),
  sliceMultipleSegments: vi.fn(),
  formatTimeForFFmpeg: vi.fn((t) => t),
}));

vi.mock('../../utils/validations', () => ({ validateFileExists: vi.fn().mockResolvedValue(undefined) }));

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

// Tests for slice command
describe('slice command', () => {
  let exitSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    vi.mocked(ensureDependencies).mockResolvedValue(true);
    vi.mocked(validateFileExists).mockResolvedValue(undefined);
    vi.mocked(checkAndPromptOverwrite).mockResolvedValue(true);
    vi.mocked(sliceVideoStreamCopy).mockResolvedValue(undefined);
    vi.mocked(sliceVideoReencode).mockResolvedValue(undefined);
    vi.mocked(sliceMultipleSegments).mockResolvedValue([]);
  });

  afterEach(() => {
    exitSpy.mockRestore();
  });

  // Tests for setupSlice
  describe('setupSlice', () => {
    let program: Command;

    beforeEach(() => {
      program = new Command();
    });

    // Should register slice command with correct options
    it('should register slice command with correct options', () => {
      setupSlice(program);
      const commands = program.commands;

      expect(commands).toHaveLength(1);
      expect(commands[0]?.name()).toBe('slice');
      expect(commands[0]?.aliases()).toContain('slc');
    });

    // Should have start option
    it('should have start option', () => {
      setupSlice(program);
      const cmd = program.commands[0];
      const startOption = cmd?.options.find((opt) => opt.long === '--start');

      expect(startOption).toBeDefined();
    });

    // Should have end option
    it('should have end option', () => {
      setupSlice(program);
      const cmd = program.commands[0];
      const endOption = cmd?.options.find((opt) => opt.long === '--end');

      expect(endOption).toBeDefined();
    });

    // Should have fast option
    it('should have fast option', () => {
      setupSlice(program);
      const cmd = program.commands[0];
      const fastOption = cmd?.options.find((opt) => opt.long === '--fast');

      expect(fastOption).toBeDefined();
    });

    // Should have precise option
    it('should have precise option', () => {
      setupSlice(program);
      const cmd = program.commands[0];
      const preciseOption = cmd?.options.find((opt) => opt.long === '--precise');

      expect(preciseOption).toBeDefined();
    });

    // Should have segments option
    it('should have segments option', () => {
      setupSlice(program);
      const cmd = program.commands[0];
      const segmentsOption = cmd?.options.find((opt) => opt.long === '--segments');

      expect(segmentsOption).toBeDefined();
    });

    // Should have codec option
    it('should have codec option with default h264', () => {
      setupSlice(program);
      const cmd = program.commands[0];
      const codecOption = cmd?.options.find((opt) => opt.long === '--codec');

      expect(codecOption).toBeDefined();
    });
  });

  // Tests for formatSecondsToFilename
  describe('formatSecondsToFilename', () => {
    // Should format seconds only
    it('should format seconds only', () => {
      expect(formatSecondsToFilename(10)).toBe('10s');
    });

    // Should format minutes and seconds
    it('should format minutes and seconds', () => {
      expect(formatSecondsToFilename(90)).toBe('1m_30s');
    });

    // Should format hours, minutes, and seconds
    it('should format hours, minutes, and seconds', () => {
      expect(formatSecondsToFilename(3661)).toBe('1h_01m_01s');
      expect(formatSecondsToFilename(3600)).toBe('1h_00m_00s');
    });
  });

  // Tests for parseSegments
  describe('parseSegments', () => {
    // Should parse multiple segments
    it('should parse multiple segments', () => {
      const segments = parseSegments('0-10,30-45');

      expect(segments).toEqual([
        { start: '0', end: '10' },
        { start: '30', end: '45' },
      ]);
    });

    // Should parse segments with whitespace
    it('should parse segments with whitespace', () => {
      const segments = parseSegments('0-10, 30-45');

      expect(segments).toEqual([
        { start: '0', end: '10' },
        { start: '30', end: '45' },
      ]);
    });

    // Should return empty array for invalid input
    it('should return empty array for invalid input', () => {
      expect(parseSegments('foo')).toEqual([]);
    });
  });

  // Tests for resolveTimeRange
  describe('resolveTimeRange', () => {
    // Should resolve time range from start and end
    it('should resolve time range from start and end', () => {
      const result = resolveTimeRange({ start: '0', end: '10' });

      expect(result).toEqual({ startTime: 0, endTime: 10, startFFmpeg: '0', endFFmpeg: '10' });
      expect(parseTimeToSeconds).toHaveBeenCalledWith('0');
      expect(parseTimeToSeconds).toHaveBeenCalledWith('10');
    });

    // Should compute end time from duration
    it('should compute end time from duration when end is missing', () => {
      const result = resolveTimeRange({ start: '10', duration: '20' });

      expect(result).toEqual({ startTime: 10, endTime: 30, startFFmpeg: '10', endFFmpeg: '30' });
    });

    // Should leave end time undefined when duration is invalid
    it('should leave end time undefined when duration is invalid', () => {
      const result = resolveTimeRange({ start: '10', duration: 'abc' });

      expect(result.endTime).toBeUndefined();
    });
  });

  // Tests for validateSliceOptions
  describe('validateSliceOptions', () => {
    // Should not exit for valid start and end
    it('should not exit for valid start and end', () => {
      validateSliceOptions({ start: '0', end: '10' });

      expect(exitSpy).not.toHaveBeenCalled();
    });

    // Should not exit for valid start and duration
    it('should not exit for valid start and duration', () => {
      validateSliceOptions({ start: '0', duration: '10' });

      expect(exitSpy).not.toHaveBeenCalled();
    });

    // Should log fail and exit when end and duration are missing
    it('should log fail and exit when end and duration are missing', () => {
      validateSliceOptions({ start: '0' });

      expect(log.fail).toHaveBeenCalledWith('Please provide --start and --end (or --duration) options');
      expect(exitSpy).toHaveBeenCalledWith(1);
    });
  });

  // Tests for resolveSliceMode
  describe('resolveSliceMode', () => {
    // Should return fast mode
    it('should return fast mode', () => {
      expect(resolveSliceMode({ fast: true })).toBe('fast');
    });

    // Should return precise mode
    it('should return precise mode', () => {
      expect(resolveSliceMode({ precise: true })).toBe('precise');
    });

    // Should return auto mode by default
    it('should return auto mode by default', () => {
      expect(resolveSliceMode({})).toBe('auto');
    });
  });

  // Tests for executeSingleSlice
  describe('executeSingleSlice', () => {
    const progressBar = { update: vi.fn(), render: vi.fn() };

    // Should use stream copy for fast mode
    it('should use stream copy for fast mode', async () => {
      vi.mocked(sliceVideoStreamCopy).mockImplementation(async (_i, _o, _s, _e, cb) => {
        cb?.(0);
      });

      await executeSingleSlice('input.mp4', 'output.mp4', '0', '10', {}, progressBar);

      expect(sliceVideoStreamCopy).toHaveBeenCalledWith('input.mp4', 'output.mp4', '0', '10', expect.any(Function));
      expect(sliceVideoReencode).not.toHaveBeenCalled();
    });

    // Should re-encode with h264 by default in precise mode
    it('should re-encode with h264 by default in precise mode', async () => {
      await executeSingleSlice('input.mp4', 'output.mp4', '0', '10', { precise: true }, progressBar);

      expect(sliceVideoReencode).toHaveBeenCalledWith(
        'input.mp4',
        'output.mp4',
        '0',
        '10',
        'h264',
        23,
        expect.any(Function)
      );
      expect(sliceVideoStreamCopy).not.toHaveBeenCalled();
    });

    // Should re-encode with hevc when codec is hevc in precise mode
    it('should re-encode with hevc when codec is hevc in precise mode', async () => {
      await executeSingleSlice('input.mp4', 'output.mp4', '0', '10', { precise: true, codec: 'hevc' }, progressBar);

      expect(sliceVideoReencode).toHaveBeenCalledWith(
        'input.mp4',
        'output.mp4',
        '0',
        '10',
        'hevc',
        23,
        expect.any(Function)
      );
    });

    // Should propagate re-encode errors
    it('should propagate re-encode errors', async () => {
      vi.mocked(sliceVideoReencode).mockRejectedValue(new Error('Encode failed'));

      await expect(
        executeSingleSlice('input.mp4', 'output.mp4', '0', '10', { precise: true }, progressBar)
      ).rejects.toThrow('Encode failed');
    });

    // Should invoke progress callback during precise re-encoding
    it('should invoke progress callback during precise re-encoding', async () => {
      const bar = { update: vi.fn(), render: vi.fn() };
      vi.mocked(sliceVideoReencode).mockImplementation(async (_i, _o, _s, _e, _codec, _crf, cb) => {
        cb?.(25);
      });

      await executeSingleSlice('input.mp4', 'output.mp4', '0', '10', { precise: true }, bar);

      expect(bar.update).toHaveBeenCalledWith(25);
      expect(bar.render).toHaveBeenCalled();
    });
  });

  // Tests for handleSingleSlice
  describe('handleSingleSlice', () => {
    // Should slice a single segment with auto mode
    it('should slice a single segment with auto mode', async () => {
      await handleSingleSlice('input.mp4', { start: '10', end: '30' });

      expect(checkAndPromptOverwrite).toHaveBeenCalledWith(['input_10s_30s.mp4']);
      expect(log.succeed).toHaveBeenCalledWith('Slicing started | 10s to 30s | Mode: auto');
      expect(createProgressBar).toHaveBeenCalled();
      expect(sliceVideoStreamCopy).toHaveBeenCalledWith(
        'input.mp4',
        'input_10s_30s.mp4',
        '10',
        '30',
        expect.any(Function)
      );
      expect(log.succeed).toHaveBeenCalledWith('Slicing completed successfully!');
      expect(log.info).toHaveBeenCalledWith(expect.stringContaining('Output:'));
    });

    // Should slice with precise mode and h264
    it('should slice with precise mode and h264', async () => {
      await handleSingleSlice('input.mp4', { start: '0', end: '10', precise: true });

      expect(log.succeed).toHaveBeenCalledWith('Slicing started | 0s to 10s | Mode: precise');
      expect(sliceVideoReencode).toHaveBeenCalledWith(
        'input.mp4',
        'input_0s_10s.mp4',
        '0',
        '10',
        'h264',
        23,
        expect.any(Function)
      );
    });

    // Should exit without slicing when overwrite is declined
    it('should exit without slicing when overwrite is declined', async () => {
      vi.mocked(checkAndPromptOverwrite).mockResolvedValue(false);
      exitSpy.mockImplementation(() => {
        throw new Error('process exit');
      });

      await expect(handleSingleSlice('input.mp4', { start: '10', end: '30' })).rejects.toThrow('process exit');

      expect(exitSpy).toHaveBeenCalledWith(0);
      expect(sliceVideoStreamCopy).not.toHaveBeenCalled();
    });

    // Should call handleError when slicing fails
    it('should call handleError when slicing fails', async () => {
      vi.mocked(sliceVideoStreamCopy).mockRejectedValue(new Error('Slice error'));

      await handleSingleSlice('input.mp4', { start: '10', end: '30' });

      expect(handleError).toHaveBeenCalledWith(expect.any(Error), 'Slicing failed: ');
    });
  });

  // Tests for handleSliceSegments
  describe('handleSliceSegments', () => {
    const segments = [
      { start: '0', end: '10' },
      { start: '30', end: '45' },
    ];

    // Should slice multiple segments
    it('should slice multiple segments', async () => {
      await handleSliceSegments('video.mp4', { segments, fast: true });

      expect(checkAndPromptOverwrite).toHaveBeenCalledWith(['./segment_1_0_10.mp4', './segment_2_30_45.mp4']);
      expect(log.succeed).toHaveBeenCalledWith('Slicing started | 2 segments | Mode: fast');
      expect(sliceMultipleSegments).toHaveBeenCalledWith('video.mp4', '.', segments, true, expect.any(Function));
      expect(log.succeed).toHaveBeenCalledWith('Slicing completed successfully!');
      expect(log.info).toHaveBeenCalledTimes(2);
    });

    // Should exit without slicing when overwrite is declined
    it('should exit without slicing when overwrite is declined', async () => {
      vi.mocked(checkAndPromptOverwrite).mockResolvedValue(false);
      exitSpy.mockImplementation(() => {
        throw new Error('process exit');
      });

      await expect(handleSliceSegments('video.mp4', { segments })).rejects.toThrow('process exit');

      expect(exitSpy).toHaveBeenCalledWith(0);
      expect(sliceMultipleSegments).not.toHaveBeenCalled();
    });

    // Should call handleError when multi-segment slicing fails
    it('should call handleError when multi-segment slicing fails', async () => {
      vi.mocked(sliceMultipleSegments).mockRejectedValue(new Error('Slice error'));

      await handleSliceSegments('video.mp4', { segments });

      expect(handleError).toHaveBeenCalledWith(expect.any(Error), 'Slicing failed: ');
    });

    // Should invoke progress callback during multi-segment slicing
    it('should invoke progress callback during multi-segment slicing', async () => {
      const bar = { start: vi.fn(), stop: vi.fn(), update: vi.fn(), render: vi.fn() } as unknown as ReturnType<
        typeof createProgressBar
      >;
      vi.mocked(createProgressBar).mockReturnValue(bar);
      vi.mocked(sliceMultipleSegments).mockImplementation(async (_i, _d, _s, _fast, cb) => {
        cb?.(50, 1);
        return [];
      });

      await handleSliceSegments('video.mp4', { segments, fast: true });

      expect(bar.update).toHaveBeenCalledWith(50, { segment: 1 });
      expect(bar.render).toHaveBeenCalled();
    });
  });

  // Tests for sliceAction
  describe('sliceAction', () => {
    // Should slice multiple segments when segments are provided
    it('should slice multiple segments when segments are provided', async () => {
      await sliceAction('video.mp4', { segments: [{ start: '0', end: '10' }] });

      expect(ensureDependencies).toHaveBeenCalled();
      expect(validateFileExists).toHaveBeenCalledWith('video.mp4');
      expect(sliceMultipleSegments).toHaveBeenCalled();
    });

    // Should slice a single segment when no segments are provided
    it('should slice a single segment when no segments are provided', async () => {
      await sliceAction('input.mp4', { start: '10', end: '30', fast: true });

      expect(sliceVideoStreamCopy).toHaveBeenCalledWith(
        'input.mp4',
        'input_10s_30s.mp4',
        '10',
        '30',
        expect.any(Function)
      );
    });

    // Should call handleError when validateFileExists fails
    it('should call handleError when validateFileExists fails', async () => {
      vi.mocked(validateFileExists).mockRejectedValue(new Error('File not found'));

      await sliceAction('input.mp4', { start: '10', end: '30' });

      expect(handleError).toHaveBeenCalledWith(expect.any(Error));
    });

    // Should call handleError when ensureDependencies fails
    it('should call handleError when ensureDependencies fails', async () => {
      vi.mocked(ensureDependencies).mockRejectedValue(new Error('Missing dependencies'));

      await sliceAction('input.mp4', { start: '10', end: '30' });

      expect(handleError).toHaveBeenCalledWith(expect.any(Error));
      expect(validateFileExists).not.toHaveBeenCalled();
    });
  });

  // Tests for parseAsync integration
  describe('parseAsync integration', () => {
    let program: Command;

    beforeEach(() => {
      program = new Command();
      setupSlice(program);
    });

    // Should parse slice command with single-segment options
    it('should parse slice command with single-segment options', async () => {
      await program.parseAsync(['slice', 'input.mp4', '--start', '10', '--end', '30', '--fast'], { from: 'user' });
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(validateFileExists).toHaveBeenCalledWith('input.mp4');
      expect(sliceVideoStreamCopy).toHaveBeenCalledWith(
        'input.mp4',
        'input_10s_30s.mp4',
        '10',
        '30',
        expect.any(Function)
      );
    });

    // Should parse slice command with segments string
    it('should parse slice command with segments string', async () => {
      await program.parseAsync(['slice', 'video.mp4', '--segments', '0-10,30-45'], { from: 'user' });
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(sliceMultipleSegments).toHaveBeenCalledWith(
        'video.mp4',
        '.',
        [
          { start: '0', end: '10' },
          { start: '30', end: '45' },
        ],
        false,
        expect.any(Function)
      );
    });
  });
});
