import { runCommand } from './dependencies';
import { parseFFmpegProgress } from './progress';
import type { ProgressInfo, SplitPreset } from '../types/index';

/**
 * Platform preset durations in seconds
 */
export const PRESET_DURATIONS: Record<SplitPreset, number> = {
  instagram: 60,
  ig: 60,
  whatsapp: 90,
  wa: 90,
  facebook: 120,
  fb: 120,
};

/**
 * Parse duration string to seconds
 *
 * @param {string} durationStr - Duration string (e.g., '60', '1:30', '00:01:30')
 * @returns {number} Duration in seconds
 */
export function parseDuration(durationStr: string): number {
  // check: if in HH:MM:SS format
  const hmsMatch = durationStr.match(/^(\d+):(\d{2}):(\d{2})(?:\.(\d+))?$/);
  if (hmsMatch) {
    const hours = parseInt(hmsMatch[1], 10);
    const mins = parseInt(hmsMatch[2], 10);
    const secs = parseInt(hmsMatch[3], 10);
    return hours * 3600 + mins * 60 + secs;
  }

  // check: if in M:SS format
  const msMatch = durationStr.match(/^(\d+):(\d{2})(?:\.(\d+))?$/);
  if (msMatch) {
    const mins = parseInt(msMatch[1], 10);
    const secs = parseInt(msMatch[2], 10);
    return mins * 60 + secs;
  }

  // check: if plain number (seconds)
  return parseFloat(durationStr);
}

/* Valid preset names for split value parsing */
const VALID_PRESETS: SplitPreset[] = ['instagram', 'ig', 'whatsapp', 'wa', 'facebook', 'fb'];

/**
 * Result type for parseSplitValue
 */
export interface ParseSplitValueResult {
  type: 'preset' | 'duration';
  value: string | number;
}

/**
 * Parse split value string to preset or duration
 *
 * @param {string} value - Split value (preset name or seconds)
 * @returns {ParseSplitValueResult} Parsed result with type and value
 * @throws {Error} If value is invalid
 */
export function parseSplitValue(value: string): ParseSplitValueResult {
  const normalizedValue = value.toLowerCase();

  if (VALID_PRESETS.includes(normalizedValue as SplitPreset)) {
    return { type: 'preset', value: normalizedValue };
  }

  const seconds = parseFloat(value);
  if (isNaN(seconds) || seconds <= 0) {
    throw new Error(`Invalid split value "${value}". Use preset (ig, wa, fb) or duration in seconds (e.g., 60)`);
  }

  return { type: 'duration', value: seconds };
}

/**
 * Calculate number of parts needed for a video
 *
 * @param {number} totalDuration - Total video duration in seconds
 * @param {number} partDuration - Max duration per part in seconds
 * @returns {number} Number of parts
 */
export function calculateNumParts(totalDuration: number, partDuration: number): number {
  return Math.ceil(totalDuration / partDuration);
}

/**
 * Get duration for a preset
 *
 * @param {SplitPreset} preset - Platform preset
 * @returns {number} Duration in seconds
 */
export function getPresetDuration(preset: SplitPreset): number {
  return PRESET_DURATIONS[preset];
}

/**
 * Split video into multiple parts using re-encoding
 *
 * @param {string} inputPath - Path to input video
 * @param {string[]} outputPaths - Pre-built array of output file paths
 * @param {number} partDuration - Max duration per part in seconds
 * @param {number} totalDuration - Total video duration in seconds
 * @param {string} codec - Video codec
 * @param {number} crf - CRF value
 * @param {(progress: number, part: number, total: number) => void} [onProgress] - Progress callback
 * @returns {Promise<string[]>} Array of output file paths
 */
export async function splitVideoReencode(
  inputPath: string,
  outputPaths: string[],
  partDuration: number,
  totalDuration: number,
  codec: 'h264' | 'hevc',
  crf: number,
  onProgress?: (progress: number, part: number, total: number) => void
): Promise<string[]> {
  const videoCodec = codec === 'hevc' ? 'libx265' : 'libx264';
  const numParts = outputPaths.length;

  for (let i = 0; i < numParts; i++) {
    const startSec = i * partDuration;
    const endSec = Math.min((i + 1) * partDuration, totalDuration);

    const startStr = formatSeconds(startSec);
    const endStr = formatSeconds(endSec);

    const outputPath = outputPaths[i];

    const command = `ffmpeg -y -ss "${startStr}" -i "${inputPath}" -to "${endStr}" -c:v ${videoCodec} -crf ${crf} -c:a aac "${outputPath}"`;

    let currentTime = 0;

    const progressCallback = (line: string) => {
      const progress: ProgressInfo | null = parseFFmpegProgress(line);
      if (progress?.type === 'time' && progress.value !== undefined) {
        currentTime = progress.value;
        if (onProgress) {
          const overallProgress = ((i * partDuration + currentTime) / totalDuration) * 100;
          onProgress(overallProgress, i + 1, numParts);
        }
      }
    };

    const result = await runCommand(command, progressCallback);
    if (result.stderr && !result.stderr.includes('frames')) {
      throw new Error(`Split failed: ${result.stderr}`);
    }

    if (onProgress) {
      const partProgress = ((i + 1) / numParts) * 100;
      onProgress(partProgress, i + 1, numParts);
    }
  }

  return outputPaths;
}

/**
 * Split video into multiple parts using stream copy (fast)
 *
 * @param {string} inputPath - Path to input video
 * @param {string[]} outputPaths - Pre-built array of output file paths
 * @param {number} partDuration - Max duration per part in seconds
 * @param {number} totalDuration - Total video duration in seconds
 * @param {(progress: number, part: number, total: number) => void} [onProgress] - Progress callback
 * @returns {Promise<string[]>} Array of output file paths
 */
export async function splitVideoStreamCopy(
  inputPath: string,
  outputPaths: string[],
  partDuration: number,
  totalDuration: number,
  onProgress?: (progress: number, part: number, total: number) => void
): Promise<string[]> {
  const numParts = outputPaths.length;

  for (let i = 0; i < numParts; i++) {
    const startSec = i * partDuration;
    const endSec = Math.min((i + 1) * partDuration, totalDuration);

    const startStr = formatSeconds(startSec);
    const endStr = formatSeconds(endSec);

    const outputPath = outputPaths[i];

    const command = `ffmpeg -y -ss "${startStr}" -i "${inputPath}" -to "${endStr}" -c copy "${outputPath}"`;

    await runCommand(command);

    if (onProgress) {
      const partProgress = ((i + 1) / numParts) * 100;
      onProgress(partProgress, i + 1, numParts);
    }
  }

  return outputPaths;
}

/**
 * Format seconds to HH:MM:SS string
 *
 * @param {number} seconds - Duration in seconds
 * @returns {string} Formatted time string
 */
export function formatSeconds(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}
