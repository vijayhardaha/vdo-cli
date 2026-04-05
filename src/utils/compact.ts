import { runCommand } from './dependencies';
import { parseFFmpegProgress } from './progress';
import { checkAndPromptOverwrite } from './prompt';
import type { ProgressInfo } from '../types/index';

/**
 * Quality preset CRF values
 */
const QUALITY_CRF: Record<string, number> = { low: 28, medium: 23, high: 18, lossless: 0 };

/**
 * Calculate target bitrate for two-pass encoding
 *
 * @param {number} targetSizeMB - Target size in megabytes
 * @param {number} durationSeconds - Video duration in seconds
 * @param {string} audioBitrate - Audio bitrate (e.g., '128k')
 * @returns {number} - Video bitrate in kbps
 */
export function calculateTargetBitrate(targetSizeMB: number, durationSeconds: number, audioBitrate: string): number {
  const audioKbps = parseInt(audioBitrate.replace('k', ''), 10);
  const totalBitrate = (targetSizeMB * 8192) / durationSeconds;
  const videoBitrate = Math.max(100, totalBitrate - audioKbps);
  return Math.floor(videoBitrate);
}

/**
 * Parse size string (e.g., '25MB', '1GB') to megabytes
 *
 * @param {string} sizeStr - Size string to parse
 * @returns {number} - Size in megabytes
 */
export function parseSizeToMB(sizeStr: string): number {
  const match = sizeStr.match(/^([\d.]+)\s*(MB|GB|KB)?$/i);
  if (!match) {
    throw new Error(`Invalid size format: ${sizeStr}`);
  }
  const value = parseFloat(match[1]);
  const unit = (match[2] || 'MB').toUpperCase();
  switch (unit) {
    case 'GB':
      return value * 1024;
    case 'KB':
      return value / 1024;
    default:
      return value;
  }
}

/**
 * Compact video to target size using two-pass encoding
 *
 * @param {string} inputPath - Path to input video
 * @param {string} outputPath - Path to output video
 * @param {number} targetBitrate - Target video bitrate in kbps
 * @param {string} audioBitrate - Audio bitrate (e.g., '128k')
 * @param {string} preset - Encoding preset
 * @param {boolean} hevc - Use HEVC codec instead of H.264
 * @param {(progress: number) => void} [onProgress] - Progress callback
 * @returns {Promise<void>}
 */
export async function compactVideo(
  inputPath: string,
  outputPath: string,
  targetBitrate: number,
  audioBitrate: string,
  preset: string,
  hevc: boolean,
  onProgress?: (progress: number) => void
): Promise<void> {
  const shouldProceed = await checkAndPromptOverwrite([outputPath]);
  if (!shouldProceed) {
    process.exit(0);
  }

  const videoCodec = hevc ? 'libx265' : 'libx264';
  const pass1Log = 'ffmpeg2pass-0.log';

  const pass1Cmd = `ffmpeg -y -i "${inputPath}" -c:v ${videoCodec} -b:v ${targetBitrate}k -pass 1 -preset ${preset} -an -f null "${pass1Log}"`;

  const pass2Cmd = `ffmpeg -y -i "${inputPath}" -c:v ${videoCodec} -b:v ${targetBitrate}k -pass 2 -preset ${preset} -c:a aac -b:a ${audioBitrate} "${outputPath}"`;

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

  // check: if two-pass encoding is selected
  if (targetBitrate > 0) {
    const pass1Result = await runCommand(pass1Cmd, progressCallback);
    if (pass1Result.stderr && !pass1Result.stderr.includes('frames')) {
      throw new Error(`Pass 1 failed: ${pass1Result.stderr}`);
    }

    const pass2Result = await runCommand(pass2Cmd, progressCallback);
    if (pass2Result.stderr && !pass2Result.stderr.includes('frames')) {
      throw new Error(`Pass 2 failed: ${pass2Result.stderr}`);
    }
  }
}

/**
 * Compact video using CRF (single-pass, faster)
 *
 * @param {string} inputPath - Path to input video
 * @param {string} outputPath - Path to output video
 * @param {number} crf - Constant Rate Factor (0-51)
 * @param {string} preset - Encoding preset
 * @param {string} audioBitrate - Audio bitrate
 * @param {boolean} hevc - Use HEVC codec
 * @param {(progress: number) => void} [onProgress] - Progress callback
 * @returns {Promise<void>}
 */
export async function compactVideoCRF(
  inputPath: string,
  outputPath: string,
  crf: number,
  preset: string,
  audioBitrate: string,
  hevc: boolean,
  onProgress?: (progress: number) => void
): Promise<void> {
  const shouldProceed = await checkAndPromptOverwrite([outputPath]);
  if (!shouldProceed) {
    process.exit(0);
  }

  const videoCodec = hevc ? 'libx265' : 'libx264';
  const command = `ffmpeg -y -i "${inputPath}" -c:v ${videoCodec} -crf ${crf} -preset ${preset} -c:a aac -b:a ${audioBitrate} "${outputPath}"`;

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
    throw new Error(`Compression failed: ${result.stderr}`);
  }
}

/**
 * Get CRF value for quality preset
 *
 * @param {string} quality - Quality preset name
 * @returns {number} - CRF value
 */
export function getCRFForQuality(quality: string): number {
  return QUALITY_CRF[quality] ?? 23;
}
