import type { ProgressInfo, SliceSegment } from '@/types/index';
import { runCommand } from '@/utils/dependencies';
import { parseFFmpegProgress } from '@/utils/progress';

/**
 * Slice video segment using stream copy (fast, may not be frame-accurate).
 *
 * @param {string} inputPath - Path to input video.
 * @param {string} outputPath - Path to output video.
 * @param {string} start - Start time (e.g., '00:00:10').
 * @param {string} end - End time (e.g., '00:00:30').
 * @param {(progress: number) => void} [onProgress] - Progress callback.
 *
 * @returns {Promise<void>}
 */
export async function sliceVideoStreamCopy(
  inputPath: string,
  outputPath: string,
  start: string,
  end: string,
  onProgress?: (progress: number) => void
): Promise<void> {
  const command = `ffmpeg -y -ss "${start}" -i "${inputPath}" -to "${end}" -c copy "${outputPath}"`;

  const totalTime = 0;
  let currentTime = 0;

  const progressCallback = (line: string) => {
    const progress: ProgressInfo | null = parseFFmpegProgress(line);
    if (progress?.type === 'time' && progress.value !== undefined) {
      if (totalTime > 0) {
        currentTime = progress.value;
        if (onProgress && currentTime > 0) {
          const percentage = Math.min(100, Math.round((currentTime / totalTime) * 100));
          onProgress(percentage);
        }
      }
    }
  };

  const result = await runCommand(command, progressCallback);
  if (result.stderr && !result.stderr.includes('time=')) {
    throw new Error(`Slice failed: ${result.stderr}`);
  }
}

/**
 * Slice video segment with re-encoding (frame-accurate, slower).
 *
 * @param {string} inputPath - Path to input video.
 * @param {string} outputPath - Path to output video.
 * @param {string} start - Start time.
 * @param {string} end - End time.
 * @param {string} codec - Video codec ('h264' or 'hevc').
 * @param {number} crf - CRF value for encoding.
 * @param {(progress: number) => void} [onProgress] - Progress callback.
 *
 * @returns {Promise<void>}
 */
export async function sliceVideoReencode(
  inputPath: string,
  outputPath: string,
  start: string,
  end: string,
  codec: 'h264' | 'hevc',
  crf: number,
  onProgress?: (progress: number) => void
): Promise<void> {
  const videoCodec = codec === 'hevc' ? 'libx265' : 'libx264';
  const command = `ffmpeg -y -ss "${start}" -i "${inputPath}" -to "${end}" -c:v ${videoCodec} -crf ${crf} -c:a aac "${outputPath}"`;

  const totalTime = 0;
  let currentTime = 0;

  const progressCallback = (line: string) => {
    const progress: ProgressInfo | null = parseFFmpegProgress(line);
    if (progress?.type === 'time' && progress.value !== undefined) {
      if (totalTime > 0) {
        currentTime = progress.value;
        if (onProgress && currentTime > 0) {
          const percentage = Math.min(100, Math.round((currentTime / totalTime) * 100));
          onProgress(percentage);
        }
      }
    }
  };

  const result = await runCommand(command, progressCallback);
  if (result.stderr && !result.stderr.includes('frames')) {
    throw new Error(`Slice failed: ${result.stderr}`);
  }
}

/**
 * Slice multiple segments from video.
 *
 * @param {string} inputPath - Path to input video.
 * @param {string} outputDir - Directory for output files.
 * @param {SliceSegment[]} segments - Array of segments to extract.
 * @param {boolean} fast - Use stream copy instead of re-encoding.
 * @param {(progress: number, segment: number) => void} [onProgress] - Progress callback.
 *
 * @returns {Promise<string[]>} - Array of output file paths.
 */
export async function sliceMultipleSegments(
  inputPath: string,
  outputDir: string,
  segments: SliceSegment[],
  fast: boolean,
  onProgress?: (progress: number, segment: number) => void
): Promise<string[]> {
  const outputPaths: string[] = [];

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    const outputPath = `${outputDir}/segment_${i + 1}_${segment.start.replace(/:/g, '')}_${segment.end.replace(/:/g, '')}.mp4`;
    outputPaths.push(outputPath);
  }

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    const outputPath = outputPaths[i];

    if (fast) {
      await sliceVideoStreamCopy(inputPath, outputPath, segment.start, segment.end);
    } else {
      await sliceVideoReencode(inputPath, outputPath, segment.start, segment.end, 'h264', 23);
    }

    if (onProgress) {
      onProgress(((i + 1) / segments.length) * 100, i + 1);
    }
  }

  return outputPaths;
}

/**
 * Parse time string to ffmpeg format.
 *
 * @param {string} timeStr - Time string (e.g., '10', '1:30', '00:01:30').
 *
 * @returns {string} - Formatted time for ffmpeg.
 */
export function formatTimeForFFmpeg(timeStr: string): string {
  // check: if already in proper format (HH:MM:SS or HH:MM:SS.ms)
  if (/^\d{1,2}:\d{2}:\d{2}/.test(timeStr)) {
    return timeStr;
  }

  // check: if in M:SS format
  if (/^\d+:\d{2}$/.test(timeStr)) {
    const [min, sec] = timeStr.split(':').map(Number);
    return `00:${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  }

  // check: if plain number (seconds)
  const seconds = parseFloat(timeStr);
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}
