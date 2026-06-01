import type { SliceSegment } from '@/types/index';
import { runCommand } from '@/utils/dependencies';
import { createFFmpegProgressCallback } from '@/utils/progress';

/**
 * Parse time string to seconds.
 *
 * @param {string} timeStr - Time string (e.g., '10', '1:30', '00:01:30').
 *
 * @returns {number} Duration in seconds.
 */
export function parseTimeToSeconds(timeStr: string): number {
  const hmsMatch = timeStr.match(/^(\d+):(\d{2}):(\d{2})(?:\.(\d+))?$/);
  if (hmsMatch) {
    const hours = parseInt(hmsMatch[1], 10);
    const mins = parseInt(hmsMatch[2], 10);
    const secs = parseInt(hmsMatch[3], 10);
    return hours * 3600 + mins * 60 + secs;
  }

  const msMatch = timeStr.match(/^(\d+):(\d{2})(?:\.(\d+))?$/);
  if (msMatch) {
    const mins = parseInt(msMatch[1], 10);
    const secs = parseInt(msMatch[2], 10);
    return mins * 60 + secs;
  }

  return parseFloat(timeStr);
}

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
  const startSec = parseTimeToSeconds(start);
  const endSec = parseTimeToSeconds(end);
  const duration = Math.max(0, endSec - startSec);
  const command = `ffmpeg -y -ss "${start}" -i "${inputPath}" -t "${duration}" -c copy "${outputPath}"`;

  const result = await runCommand(command, createFFmpegProgressCallback(duration, onProgress));
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
  const startSec = parseTimeToSeconds(start);
  const endSec = parseTimeToSeconds(end);
  const duration = Math.max(0, endSec - startSec);
  const command = `ffmpeg -y -ss "${start}" -i "${inputPath}" -t "${duration}" -c:v ${videoCodec} -crf ${crf} -c:a aac "${outputPath}"`;

  const result = await runCommand(command, createFFmpegProgressCallback(duration, onProgress));
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
