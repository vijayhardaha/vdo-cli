import { describe, it, expect, vi, beforeEach } from 'vitest';
import { convertVideo, compressVideo, speedUpVideo, extractAudio } from '../src/utils/ffmpeg.js';

vi.mock('../src/utils/dependencies.js', () => ({
  runCommand: vi.fn(),
}));

vi.mock('../src/utils/progress.js', () => ({
  parseFFmpegProgress: vi.fn(),
}));

describe('ffmpeg utils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('convertVideo', () => {
    it('should call ffprobe then ffmpeg with correct commands', async () => {
      const { runCommand } = await import('../src/utils/dependencies.js');
      const { parseFFmpegProgress } = await import('../src/utils/progress.js');
      vi.mocked(runCommand).mockResolvedValue({ stdout: '120.5', stderr: '' });
      vi.mocked(parseFFmpegProgress).mockReturnValue(null);

      await convertVideo('input.mp4', 'output.mp4');

      expect(vi.mocked(runCommand)).toHaveBeenCalledTimes(2);
      const [firstCall, secondCall] = vi.mocked(runCommand).mock.calls;
      expect(firstCall?.[0]).toContain('ffprobe');
      expect(secondCall?.[0]).toContain('ffmpeg');
      expect(secondCall?.[0]).toContain('libx264');
    });

    it('should use provided preset', async () => {
      const { runCommand } = await import('../src/utils/dependencies.js');
      vi.mocked(runCommand).mockResolvedValue({ stdout: '60', stderr: '' });

      await convertVideo('input.mp4', 'output.mp4', 'mkv', 'slow');

      const ffmpegCall = vi.mocked(runCommand).mock.calls[1]?.[0];
      expect(ffmpegCall).toContain('-preset slow');
    });

    it('should map high-quality preset to slow', async () => {
      const { runCommand } = await import('../src/utils/dependencies.js');
      vi.mocked(runCommand).mockResolvedValue({ stdout: '60', stderr: '' });

      await convertVideo('input.mp4', 'output.mp4', 'mp4', 'high-quality');

      const ffmpegCall = vi.mocked(runCommand).mock.calls[1]?.[0];
      expect(ffmpegCall).toContain('-preset slow');
    });

    it('should fall back to fast preset for unknown preset', async () => {
      const { runCommand } = await import('../src/utils/dependencies.js');
      vi.mocked(runCommand).mockResolvedValue({ stdout: '60', stderr: '' });

      await convertVideo('input.mp4', 'output.mp4', 'mp4', 'unknown-preset');

      const ffmpegCall = vi.mocked(runCommand).mock.calls[1]?.[0];
      expect(ffmpegCall).toContain('-preset fast');
    });

    it('should call onProgress when time progress is reported', async () => {
      const { runCommand } = await import('../src/utils/dependencies.js');
      const { parseFFmpegProgress } = await import('../src/utils/progress.js');

      vi.mocked(runCommand).mockImplementation(async (_cmd, onOutput) => {
        if (onOutput && _cmd.includes('ffmpeg')) {
          onOutput('time=00:01:00.00 bitrate=...', 'stderr');
        }
        return { stdout: '120', stderr: '' };
      });

      vi.mocked(parseFFmpegProgress).mockImplementation(line => {
        if (line.includes('time=')) return { type: 'time', value: 60 };
        return null;
      });

      const onProgress = vi.fn();
      await convertVideo('input.mp4', 'output.mp4', 'mp4', 'fast', onProgress);
      expect(onProgress).toHaveBeenCalledWith(50, 60, 120);
    });

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
      expect(onProgress).not.toHaveBeenCalled();
    });

    it('should not call onProgress when progress has no value', async () => {
      const { runCommand } = await import('../src/utils/dependencies.js');
      const { parseFFmpegProgress } = await import('../src/utils/progress.js');

      vi.mocked(runCommand).mockImplementation(async (_cmd, onOutput) => {
        if (onOutput && _cmd.includes('ffmpeg')) {
          onOutput('time data', 'stderr');
        }
        return { stdout: '120', stderr: '' };
      });

      // Return time type but without a value
      vi.mocked(parseFFmpegProgress).mockReturnValue({ type: 'time' });
      const onProgress = vi.fn();
      await convertVideo('input.mp4', 'output.mp4', 'mp4', 'fast', onProgress);
      expect(onProgress).not.toHaveBeenCalled();
    });
  });

  describe('compressVideo', () => {
    it('should call ffprobe then ffmpeg with crf value', async () => {
      const { runCommand } = await import('../src/utils/dependencies.js');
      vi.mocked(runCommand).mockResolvedValue({ stdout: '90', stderr: '' });

      await compressVideo('input.mp4', 'output.mp4', 28, 'medium');

      expect(vi.mocked(runCommand)).toHaveBeenCalledTimes(2);
      const ffmpegCall = vi.mocked(runCommand).mock.calls[1]?.[0];
      expect(ffmpegCall).toContain('-crf 28');
      expect(ffmpegCall).toContain('-preset medium');
    });

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
      expect(onProgress).toHaveBeenCalledWith(50, 90, 180);
    });

    it('should not call onProgress on stdout data', async () => {
      const { runCommand } = await import('../src/utils/dependencies.js');
      const { parseFFmpegProgress } = await import('../src/utils/progress.js');

      vi.mocked(runCommand).mockImplementation(async (_cmd, onOutput) => {
        if (onOutput && _cmd.includes('ffmpeg')) {
          onOutput('some stdout', 'stdout');
        }
        return { stdout: '60', stderr: '' };
      });

      vi.mocked(parseFFmpegProgress).mockReturnValue(null);
      const onProgress = vi.fn();
      await compressVideo('input.mp4', 'output.mp4', 28, 'medium', onProgress);
      expect(onProgress).not.toHaveBeenCalled();
    });

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
      expect(onProgress).not.toHaveBeenCalled();
    });
  });

  describe('speedUpVideo', () => {
    it('should use atempo filter for rate in 0.5-2.0 range', async () => {
      const { runCommand } = await import('../src/utils/dependencies.js');
      vi.mocked(runCommand).mockResolvedValue({ stdout: '60', stderr: '' });

      await speedUpVideo('input.mp4', 'output.mp4', 1.5);

      const ffmpegCall = vi.mocked(runCommand).mock.calls[1]?.[0];
      expect(ffmpegCall).toContain('atempo=1.5');
    });

    it('should chain atempo filters for rate > 2', async () => {
      const { runCommand } = await import('../src/utils/dependencies.js');
      vi.mocked(runCommand).mockResolvedValue({ stdout: '60', stderr: '' });

      await speedUpVideo('input.mp4', 'output.mp4', 4);

      const ffmpegCall = vi.mocked(runCommand).mock.calls[1]?.[0];
      expect(ffmpegCall).toContain('atempo=2');
    });

    it('should chain atempo filters for rate < 0.5', async () => {
      const { runCommand } = await import('../src/utils/dependencies.js');
      vi.mocked(runCommand).mockResolvedValue({ stdout: '60', stderr: '' });

      await speedUpVideo('input.mp4', 'output.mp4', 0.25);

      const ffmpegCall = vi.mocked(runCommand).mock.calls[1]?.[0];
      // 0.25 is chained as atempo=0.5,atempo=0.5
      expect(ffmpegCall).toContain('atempo=0.5,atempo=0.5');
    });

    it('should use setpts filter for video speed', async () => {
      const { runCommand } = await import('../src/utils/dependencies.js');
      vi.mocked(runCommand).mockResolvedValue({ stdout: '60', stderr: '' });

      await speedUpVideo('input.mp4', 'output.mp4', 2);

      const ffmpegCall = vi.mocked(runCommand).mock.calls[1]?.[0];
      expect(ffmpegCall).toContain('setpts=');
    });

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
      expect(onProgress).toHaveBeenCalledWith(50, 30, 60);
    });

    it('should not call onProgress on stdout', async () => {
      const { runCommand } = await import('../src/utils/dependencies.js');
      const { parseFFmpegProgress } = await import('../src/utils/progress.js');

      vi.mocked(runCommand).mockImplementation(async (_cmd, onOutput) => {
        if (onOutput && _cmd.includes('ffmpeg')) {
          onOutput('stdout data', 'stdout');
        }
        return { stdout: '60', stderr: '' };
      });

      vi.mocked(parseFFmpegProgress).mockReturnValue(null);
      const onProgress = vi.fn();
      await speedUpVideo('input.mp4', 'output.mp4', 2, onProgress);
      expect(onProgress).not.toHaveBeenCalled();
    });

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
      expect(onProgress).not.toHaveBeenCalled();
    });
  });

  describe('extractAudio', () => {
    it('should extract mp3 with libmp3lame codec', async () => {
      const { runCommand } = await import('../src/utils/dependencies.js');
      vi.mocked(runCommand).mockResolvedValue({ stdout: '', stderr: '' });

      await extractAudio('input.mp4', 'output.mp3', 'mp3', '192k');

      const cmd = vi.mocked(runCommand).mock.calls[0]?.[0];
      expect(cmd).toContain('libmp3lame');
      expect(cmd).toContain('-b:a 192k');
      expect(cmd).toContain('-f mp3');
    });

    it('should extract wav with pcm_s16le codec', async () => {
      const { runCommand } = await import('../src/utils/dependencies.js');
      vi.mocked(runCommand).mockResolvedValue({ stdout: '', stderr: '' });

      await extractAudio('input.mp4', 'output.wav', 'wav', '320k');

      const cmd = vi.mocked(runCommand).mock.calls[0]?.[0];
      expect(cmd).toContain('pcm_s16le');
      expect(cmd).toContain('-f wav');
    });

    it('should extract aac with adts format', async () => {
      const { runCommand } = await import('../src/utils/dependencies.js');
      vi.mocked(runCommand).mockResolvedValue({ stdout: '', stderr: '' });

      await extractAudio('input.mp4', 'output.aac', 'aac', '128k');

      const cmd = vi.mocked(runCommand).mock.calls[0]?.[0];
      expect(cmd).toContain('aac');
      expect(cmd).toContain('-f adts');
    });

    it('should use default format mp3 and bitrate 192k', async () => {
      const { runCommand } = await import('../src/utils/dependencies.js');
      vi.mocked(runCommand).mockResolvedValue({ stdout: '', stderr: '' });

      await extractAudio('input.mp4', 'output.mp3');

      const cmd = vi.mocked(runCommand).mock.calls[0]?.[0];
      expect(cmd).toContain('libmp3lame');
      expect(cmd).toContain('-b:a 192k');
    });
  });
});
