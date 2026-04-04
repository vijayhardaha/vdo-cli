import { describe, it, expect, vi, beforeEach } from 'vitest';

import { convertVideo, compressVideo, speedUpVideo, extractAudio } from '../src/utils/ffmpeg.js';

vi.mock('../src/utils/dependencies.js', () => ({ runCommand: vi.fn() }));

vi.mock('../src/utils/progress.js', () => ({ parseFFmpegProgress: vi.fn() }));

// describe: ffmpeg utilities
describe('ffmpeg utils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // describe: convertVideo
  describe('convertVideo', () => {
    // it: should call ffprobe then ffmpeg with correct commands
    it('should call ffprobe then ffmpeg with correct commands', async () => {
      const { runCommand } = await import('../src/utils/dependencies.js');
      const { parseFFmpegProgress } = await import('../src/utils/progress.js');
      vi.mocked(runCommand).mockResolvedValue({ stdout: '120.5', stderr: '' });
      vi.mocked(parseFFmpegProgress).mockReturnValue(null);

      await convertVideo('input.mp4', 'output.mp4');

      // expect: ffprobe and ffmpeg are both called
      expect(vi.mocked(runCommand)).toHaveBeenCalledTimes(2);
      const [firstCall, secondCall] = vi.mocked(runCommand).mock.calls;
      expect(firstCall?.[0]).toContain('ffprobe');
      expect(secondCall?.[0]).toContain('ffmpeg');
      expect(secondCall?.[0]).toContain('libx264');
    });

    // it: should use provided preset
    it('should use provided preset', async () => {
      const { runCommand } = await import('../src/utils/dependencies.js');
      vi.mocked(runCommand).mockResolvedValue({ stdout: '60', stderr: '' });

      await convertVideo('input.mp4', 'output.mp4', 'mkv', 'slow');

      // expect: ffmpeg command contains preset
      const ffmpegCall = vi.mocked(runCommand).mock.calls[1]?.[0];
      expect(ffmpegCall).toContain('-preset slow');
    });

    // it: should map high-quality preset to slow
    it('should map high-quality preset to slow', async () => {
      const { runCommand } = await import('../src/utils/dependencies.js');
      vi.mocked(runCommand).mockResolvedValue({ stdout: '60', stderr: '' });

      await convertVideo('input.mp4', 'output.mp4', 'mp4', 'high-quality');

      // expect: preset is mapped to slow
      const ffmpegCall = vi.mocked(runCommand).mock.calls[1]?.[0];
      expect(ffmpegCall).toContain('-preset slow');
    });

    // it: should fall back to fast preset for unknown preset
    it('should fall back to fast preset for unknown preset', async () => {
      const { runCommand } = await import('../src/utils/dependencies.js');
      vi.mocked(runCommand).mockResolvedValue({ stdout: '60', stderr: '' });

      await convertVideo('input.mp4', 'output.mp4', 'mp4', 'unknown-preset');

      // expect: preset falls back to fast
      const ffmpegCall = vi.mocked(runCommand).mock.calls[1]?.[0];
      expect(ffmpegCall).toContain('-preset fast');
    });

    // it: should call onProgress when time progress is reported
    it('should call onProgress when time progress is reported', async () => {
      const { runCommand } = await import('../src/utils/dependencies.js');
      const { parseFFmpegProgress } = await import('../src/utils/progress.js');

      vi.mocked(runCommand).mockImplementation(async (_cmd, onOutput) => {
        if (onOutput && _cmd.includes('ffmpeg')) {
          onOutput('time=00:01:00.00 bitrate=...', 'stderr');
        }
        return { stdout: '120', stderr: '' };
      });

      vi.mocked(parseFFmpegProgress).mockImplementation((line) => {
        if (line.includes('time=')) return { type: 'time', value: 60 };
        return null;
      });

      const onProgress = vi.fn();
      await convertVideo('input.mp4', 'output.mp4', 'mp4', 'fast', onProgress);

      // expect: onProgress is called with correct values
      expect(onProgress).toHaveBeenCalledWith(50, 60, 120);
    });

    // it: should not call onProgress when stdout data arrives
    it('should not call onProgress when stdout data arrives', async () => {
      const { runCommand } = await import('../src/utils/dependencies.js');
      const { parseFFmpegProgress } = await import('../src/utils/progress.js');

      vi.mocked(runCommand).mockImplementation(async (_cmd, onOutput) => {
        if (onOutput && _cmd.includes('ffmpeg')) {
          onOutput('stdout data', 'stdout');
        }
        return { stdout: '120', stderr: '' };
      });

      vi.mocked(parseFFmpegProgress).mockReturnValue(null);
      const onProgress = vi.fn();
      await convertVideo('input.mp4', 'output.mp4', 'mp4', 'fast', onProgress);

      // expect: onProgress is not called for stdout
      expect(onProgress).not.toHaveBeenCalled();
    });

    // it: should not call onProgress when progress has no value
    it('should not call onProgress when progress has no value', async () => {
      const { runCommand } = await import('../src/utils/dependencies.js');
      const { parseFFmpegProgress } = await import('../src/utils/progress.js');

      vi.mocked(runCommand).mockImplementation(async (_cmd, onOutput) => {
        if (onOutput && _cmd.includes('ffmpeg')) {
          onOutput('time data', 'stderr');
        }
        return { stdout: '120', stderr: '' };
      });

      // expect: onProgress is not called when value is missing
      vi.mocked(parseFFmpegProgress).mockReturnValue({ type: 'time' });
      const onProgress = vi.fn();
      await convertVideo('input.mp4', 'output.mp4', 'mp4', 'fast', onProgress);
      expect(onProgress).not.toHaveBeenCalled();
    });

    // it: should not call onProgress when onProgress is null
    it('should not call onProgress when onProgress is null', async () => {
      const { runCommand } = await import('../src/utils/dependencies.js');
      const { parseFFmpegProgress } = await import('../src/utils/progress.js');

      vi.mocked(runCommand).mockImplementation(async (_cmd, onOutput) => {
        if (onOutput && _cmd.includes('ffmpeg')) {
          onOutput('time=00:01:00.00', 'stderr');
        }
        return { stdout: '120', stderr: '' };
      });

      vi.mocked(parseFFmpegProgress).mockReturnValue({ type: 'time', value: 60 });
      // expect: no error thrown with null callback
      await convertVideo('input.mp4', 'output.mp4', 'mp4', 'fast', null);
    });
  });

  // describe: compressVideo
  describe('compressVideo', () => {
    // it: should call ffprobe then ffmpeg with crf value
    it('should call ffprobe then ffmpeg with crf value', async () => {
      const { runCommand } = await import('../src/utils/dependencies.js');
      vi.mocked(runCommand).mockResolvedValue({ stdout: '90', stderr: '' });

      await compressVideo('input.mp4', 'output.mp4', 28, 'medium');

      // expect: both ffprobe and ffmpeg are called with correct args
      expect(vi.mocked(runCommand)).toHaveBeenCalledTimes(2);
      const ffmpegCall = vi.mocked(runCommand).mock.calls[1]?.[0];
      expect(ffmpegCall).toContain('-crf 28');
      expect(ffmpegCall).toContain('-preset medium');
    });

    // it: should call onProgress with correct percentage
    it('should call onProgress with correct percentage', async () => {
      const { runCommand } = await import('../src/utils/dependencies.js');
      const { parseFFmpegProgress } = await import('../src/utils/progress.js');

      vi.mocked(runCommand).mockImplementation(async (_cmd, onOutput) => {
        if (onOutput && _cmd.includes('ffmpeg')) {
          onOutput('time=00:01:30.00', 'stderr');
        }
        return { stdout: '180', stderr: '' };
      });

      vi.mocked(parseFFmpegProgress).mockReturnValue({ type: 'time', value: 90 });
      const onProgress = vi.fn();
      await compressVideo('input.mp4', 'output.mp4', 23, 'slow', onProgress);

      // expect: onProgress is called with 50% (90/180)
      expect(onProgress).toHaveBeenCalledWith(50, 90, 180);
    });

    // it: should not call onProgress when progress type is not time
    it('should not call onProgress when progress type is not time', async () => {
      const { runCommand } = await import('../src/utils/dependencies.js');
      const { parseFFmpegProgress } = await import('../src/utils/progress.js');

      vi.mocked(runCommand).mockImplementation(async (_cmd, onOutput) => {
        if (onOutput && _cmd.includes('ffmpeg')) {
          onOutput('fps=30', 'stderr');
        }
        return { stdout: '180', stderr: '' };
      });

      vi.mocked(parseFFmpegProgress).mockReturnValue({ type: 'fps', value: 30 });
      const onProgress = vi.fn();
      await compressVideo('input.mp4', 'output.mp4', 23, 'slow', onProgress);

      // expect: onProgress is not called for non-time types
      expect(onProgress).not.toHaveBeenCalled();
    });

    // it: should not call onProgress when progress has no value
    it('should not call onProgress when progress has no value', async () => {
      const { runCommand } = await import('../src/utils/dependencies.js');
      const { parseFFmpegProgress } = await import('../src/utils/progress.js');

      vi.mocked(runCommand).mockImplementation(async (_cmd, onOutput) => {
        if (onOutput && _cmd.includes('ffmpeg')) {
          onOutput('time data', 'stderr');
        }
        return { stdout: '180', stderr: '' };
      });

      vi.mocked(parseFFmpegProgress).mockReturnValue({ type: 'time' });
      const onProgress = vi.fn();
      await compressVideo('input.mp4', 'output.mp4', 23, 'slow', onProgress);

      // expect: onProgress is not called when value is missing
      expect(onProgress).not.toHaveBeenCalled();
    });

    // it: should not call onProgress when totalTime is 0
    it('should not call onProgress when totalTime is 0', async () => {
      const { runCommand } = await import('../src/utils/dependencies.js');
      const { parseFFmpegProgress } = await import('../src/utils/progress.js');

      vi.mocked(runCommand).mockImplementation(async (_cmd, onOutput) => {
        if (onOutput && _cmd.includes('ffmpeg')) {
          onOutput('time data', 'stderr');
        }
        return { stdout: '0', stderr: '' };
      });

      vi.mocked(parseFFmpegProgress).mockReturnValue({ type: 'time', value: 30 });
      const onProgress = vi.fn();
      await compressVideo('input.mp4', 'output.mp4', 28, 'medium', onProgress);

      // expect: onProgress is not called when totalTime is 0
      expect(onProgress).not.toHaveBeenCalled();
    });

    // it: should not call onProgress when onProgress is null
    it('should not call onProgress when onProgress is null', async () => {
      const { runCommand } = await import('../src/utils/dependencies.js');
      const { parseFFmpegProgress } = await import('../src/utils/progress.js');

      vi.mocked(runCommand).mockImplementation(async (_cmd, onOutput) => {
        if (onOutput && _cmd.includes('ffmpeg')) {
          onOutput('time=00:01:30.00', 'stderr');
        }
        return { stdout: '180', stderr: '' };
      });

      vi.mocked(parseFFmpegProgress).mockReturnValue({ type: 'time', value: 90 });
      // expect: no error thrown with null callback
      await compressVideo('input.mp4', 'output.mp4', 28, 'medium', null);
    });

    // it: should not call onProgress when output type is stdout
    it('should not call onProgress when output type is stdout', async () => {
      const { runCommand } = await import('../src/utils/dependencies.js');
      const { parseFFmpegProgress } = await import('../src/utils/progress.js');

      vi.mocked(runCommand).mockImplementation(async (_cmd, onOutput) => {
        if (onOutput && _cmd.includes('ffmpeg')) {
          onOutput('some output', 'stdout');
        }
        return { stdout: '180', stderr: '' };
      });

      vi.mocked(parseFFmpegProgress).mockReturnValue({ type: 'time', value: 90 });
      const onProgress = vi.fn();
      await compressVideo('input.mp4', 'output.mp4', 28, 'medium', onProgress);

      // expect: onProgress is not called for stdout output
      expect(onProgress).not.toHaveBeenCalled();
    });
  });

  // describe: speedUpVideo
  describe('speedUpVideo', () => {
    // it: should use atempo filter for rate in 0.5-2.0 range
    it('should use atempo filter for rate in 0.5-2.0 range', async () => {
      const { runCommand } = await import('../src/utils/dependencies.js');
      vi.mocked(runCommand).mockResolvedValue({ stdout: '60', stderr: '' });

      await speedUpVideo('input.mp4', 'output.mp4', 1.5);

      // expect: ffmpeg command uses atempo filter
      const ffmpegCall = vi.mocked(runCommand).mock.calls[1]?.[0];
      expect(ffmpegCall).toContain('atempo=1.5');
    });

    // it: should chain atempo filters for rate > 2
    it('should chain atempo filters for rate > 2', async () => {
      const { runCommand } = await import('../src/utils/dependencies.js');
      vi.mocked(runCommand).mockResolvedValue({ stdout: '60', stderr: '' });

      await speedUpVideo('input.mp4', 'output.mp4', 4);

      // expect: ffmpeg command chains atempo filters
      const ffmpegCall = vi.mocked(runCommand).mock.calls[1]?.[0];
      expect(ffmpegCall).toContain('atempo=2');
    });

    // it: should chain atempo filters for rate > 2 with exact factors
    it('should chain atempo filters for rate > 2 with exact factors', async () => {
      const { runCommand } = await import('../src/utils/dependencies.js');
      vi.mocked(runCommand).mockResolvedValue({ stdout: '60', stderr: '' });

      await speedUpVideo('input.mp4', 'output.mp4', 3);

      // expect: 3 is chained as atempo=2,atempo=1.5
      const ffmpegCall = vi.mocked(runCommand).mock.calls[1]?.[0];
      expect(ffmpegCall).toContain('atempo=2');
      expect(ffmpegCall).toContain('atempo=1.5');
    });

    // it: should chain atempo filters for rate < 0.5
    it('should chain atempo filters for rate < 0.5', async () => {
      const { runCommand } = await import('../src/utils/dependencies.js');
      vi.mocked(runCommand).mockResolvedValue({ stdout: '60', stderr: '' });

      await speedUpVideo('input.mp4', 'output.mp4', 0.25);

      // expect: 0.25 is chained as atempo=0.5,atempo=0.5
      const ffmpegCall = vi.mocked(runCommand).mock.calls[1]?.[0];
      expect(ffmpegCall).toContain('atempo=0.5,atempo=0.5');
    });

    // it: should chain atempo filters for rate < 0.5 with exact factors
    it('should chain atempo filters for rate < 0.5 with exact factors', async () => {
      const { runCommand } = await import('../src/utils/dependencies.js');
      vi.mocked(runCommand).mockResolvedValue({ stdout: '60', stderr: '' });

      await speedUpVideo('input.mp4', 'output.mp4', 0.3);

      // expect: 0.3 is chained as atempo=0.5,atempo=0.6
      const ffmpegCall = vi.mocked(runCommand).mock.calls[1]?.[0];
      expect(ffmpegCall).toContain('atempo=0.5');
      expect(ffmpegCall).toContain('atempo=0.6');
    });

    // it: should call onProgress when rate < 0.5 and time progress reported
    it('should call onProgress when rate < 0.5 and time progress reported', async () => {
      const { runCommand } = await import('../src/utils/dependencies.js');
      const { parseFFmpegProgress } = await import('../src/utils/progress.js');

      vi.mocked(runCommand).mockImplementation(async (_cmd, onOutput) => {
        if (onOutput && _cmd.includes('ffmpeg')) {
          onOutput('time=00:00:30.00', 'stderr');
        }
        return { stdout: '60', stderr: '' };
      });

      vi.mocked(parseFFmpegProgress).mockReturnValue({ type: 'time', value: 30 });
      const onProgress = vi.fn();
      await speedUpVideo('input.mp4', 'output.mp4', 0.25, onProgress);

      // expect: onProgress is called with 50%
      expect(onProgress).toHaveBeenCalledWith(50, 30, 60);
    });

    // it: should call onProgress when rate > 2 and time progress reported
    it('should call onProgress when rate > 2 and time progress reported', async () => {
      const { runCommand } = await import('../src/utils/dependencies.js');
      const { parseFFmpegProgress } = await import('../src/utils/progress.js');

      vi.mocked(runCommand).mockImplementation(async (_cmd, onOutput) => {
        if (onOutput && _cmd.includes('ffmpeg')) {
          onOutput('time=00:00:30.00', 'stderr');
        }
        return { stdout: '60', stderr: '' };
      });

      vi.mocked(parseFFmpegProgress).mockReturnValue({ type: 'time', value: 30 });
      const onProgress = vi.fn();
      await speedUpVideo('input.mp4', 'output.mp4', 4, onProgress);

      // expect: onProgress is called with 50%
      expect(onProgress).toHaveBeenCalledWith(50, 30, 60);
    });

    // it: should use setpts filter for video speed
    it('should use setpts filter for video speed', async () => {
      const { runCommand } = await import('../src/utils/dependencies.js');
      vi.mocked(runCommand).mockResolvedValue({ stdout: '60', stderr: '' });

      await speedUpVideo('input.mp4', 'output.mp4', 2);

      // expect: ffmpeg command uses setpts filter
      const ffmpegCall = vi.mocked(runCommand).mock.calls[1]?.[0];
      expect(ffmpegCall).toContain('setpts=');
    });

    // it: should call onProgress with correct percentage
    it('should call onProgress with correct percentage', async () => {
      const { runCommand } = await import('../src/utils/dependencies.js');
      const { parseFFmpegProgress } = await import('../src/utils/progress.js');

      vi.mocked(runCommand).mockImplementation(async (_cmd, onOutput) => {
        if (onOutput && _cmd.includes('ffmpeg')) {
          onOutput('time=00:00:30.00', 'stderr');
        }
        return { stdout: '60', stderr: '' };
      });

      vi.mocked(parseFFmpegProgress).mockReturnValue({ type: 'time', value: 30 });
      const onProgress = vi.fn();
      await speedUpVideo('input.mp4', 'output.mp4', 2, onProgress);

      // expect: onProgress is called with 50%
      expect(onProgress).toHaveBeenCalledWith(50, 30, 60);
    });

    // it: should not call onProgress when progress type is not time
    it('should not call onProgress when progress type is not time', async () => {
      const { runCommand } = await import('../src/utils/dependencies.js');
      const { parseFFmpegProgress } = await import('../src/utils/progress.js');

      vi.mocked(runCommand).mockImplementation(async (_cmd, onOutput) => {
        if (onOutput && _cmd.includes('ffmpeg')) {
          onOutput('fps=30', 'stderr');
        }
        return { stdout: '60', stderr: '' };
      });

      vi.mocked(parseFFmpegProgress).mockReturnValue({ type: 'fps', value: 30 });
      const onProgress = vi.fn();
      await speedUpVideo('input.mp4', 'output.mp4', 2, onProgress);

      // expect: onProgress is not called for non-time types
      expect(onProgress).not.toHaveBeenCalled();
    });

    // it: should not call onProgress when progress has no value
    it('should not call onProgress when progress has no value', async () => {
      const { runCommand } = await import('../src/utils/dependencies.js');
      const { parseFFmpegProgress } = await import('../src/utils/progress.js');

      vi.mocked(runCommand).mockImplementation(async (_cmd, onOutput) => {
        if (onOutput && _cmd.includes('ffmpeg')) {
          onOutput('time data', 'stderr');
        }
        return { stdout: '60', stderr: '' };
      });

      vi.mocked(parseFFmpegProgress).mockReturnValue({ type: 'time' });
      const onProgress = vi.fn();
      await speedUpVideo('input.mp4', 'output.mp4', 2, onProgress);

      // expect: onProgress is not called when value is missing
      expect(onProgress).not.toHaveBeenCalled();
    });

    // it: should not call onProgress when totalTime is 0
    it('should not call onProgress when totalTime is 0', async () => {
      const { runCommand } = await import('../src/utils/dependencies.js');
      const { parseFFmpegProgress } = await import('../src/utils/progress.js');

      vi.mocked(runCommand).mockImplementation(async (_cmd, onOutput) => {
        if (onOutput && _cmd.includes('ffmpeg')) {
          onOutput('time data', 'stderr');
        }
        return { stdout: '0', stderr: '' };
      });

      vi.mocked(parseFFmpegProgress).mockReturnValue({ type: 'time', value: 10 });
      const onProgress = vi.fn();
      await speedUpVideo('input.mp4', 'output.mp4', 2, onProgress);

      // expect: onProgress is not called when totalTime is 0
      expect(onProgress).not.toHaveBeenCalled();
    });

    // it: should not call onProgress when onProgress is null
    it('should not call onProgress when onProgress is null', async () => {
      const { runCommand } = await import('../src/utils/dependencies.js');
      const { parseFFmpegProgress } = await import('../src/utils/progress.js');

      vi.mocked(runCommand).mockImplementation(async (_cmd, onOutput) => {
        if (onOutput && _cmd.includes('ffmpeg')) {
          onOutput('time=00:00:30.00', 'stderr');
        }
        return { stdout: '60', stderr: '' };
      });

      vi.mocked(parseFFmpegProgress).mockReturnValue({ type: 'time', value: 30 });
      // expect: no error thrown with null callback
      await speedUpVideo('input.mp4', 'output.mp4', 2, null);
    });

    // it: should not call onProgress when output type is stdout
    it('should not call onProgress when output type is stdout', async () => {
      const { runCommand } = await import('../src/utils/dependencies.js');
      const { parseFFmpegProgress } = await import('../src/utils/progress.js');

      vi.mocked(runCommand).mockImplementation(async (_cmd, onOutput) => {
        if (onOutput && _cmd.includes('ffmpeg')) {
          onOutput('some output', 'stdout');
        }
        return { stdout: '60', stderr: '' };
      });

      vi.mocked(parseFFmpegProgress).mockReturnValue({ type: 'time', value: 30 });
      const onProgress = vi.fn();
      await speedUpVideo('input.mp4', 'output.mp4', 2, onProgress);

      // expect: onProgress is not called for stdout output
      expect(onProgress).not.toHaveBeenCalled();
    });
  });

  // describe: extractAudio
  describe('extractAudio', () => {
    // it: should extract mp3 with libmp3lame codec
    it('should extract mp3 with libmp3lame codec', async () => {
      const { runCommand } = await import('../src/utils/dependencies.js');
      vi.mocked(runCommand).mockResolvedValue({ stdout: '', stderr: '' });

      await extractAudio('input.mp4', 'output.mp3', 'mp3', '192k');

      // expect: command uses correct mp3 settings
      const cmd = vi.mocked(runCommand).mock.calls[0]?.[0];
      expect(cmd).toContain('libmp3lame');
      expect(cmd).toContain('-b:a 192k');
      expect(cmd).toContain('-f mp3');
    });

    // it: should extract wav with pcm_s16le codec
    it('should extract wav with pcm_s16le codec', async () => {
      const { runCommand } = await import('../src/utils/dependencies.js');
      vi.mocked(runCommand).mockResolvedValue({ stdout: '', stderr: '' });

      await extractAudio('input.mp4', 'output.wav', 'wav', '320k');

      // expect: command uses correct wav settings
      const cmd = vi.mocked(runCommand).mock.calls[0]?.[0];
      expect(cmd).toContain('pcm_s16le');
      expect(cmd).toContain('-f wav');
    });

    // it: should extract aac with adts format
    it('should extract aac with adts format', async () => {
      const { runCommand } = await import('../src/utils/dependencies.js');
      vi.mocked(runCommand).mockResolvedValue({ stdout: '', stderr: '' });

      await extractAudio('input.mp4', 'output.aac', 'aac', '128k');

      // expect: command uses correct aac settings
      const cmd = vi.mocked(runCommand).mock.calls[0]?.[0];
      expect(cmd).toContain('aac');
      expect(cmd).toContain('-f adts');
    });

    // it: should use default format mp3 and bitrate 192k
    it('should use default format mp3 and bitrate 192k', async () => {
      const { runCommand } = await import('../src/utils/dependencies.js');
      vi.mocked(runCommand).mockResolvedValue({ stdout: '', stderr: '' });

      await extractAudio('input.mp4', 'output.mp3');

      // expect: command uses default mp3 settings
      const cmd = vi.mocked(runCommand).mock.calls[0]?.[0];
      expect(cmd).toContain('libmp3lame');
      expect(cmd).toContain('-b:a 192k');
    });
  });
});
