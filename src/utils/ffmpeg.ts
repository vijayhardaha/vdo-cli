import { runCommand } from '@/utils/dependencies';
import { createFFmpegProgressCallback } from '@/utils/progress';
import { checkAndPromptOverwrite } from '@/utils/prompt';

/**
 * Get video duration using ffprobe.
 *
 * @param {string} inputPath - Path to the input video file.
 *
 * @returns {Promise<number>} Video duration in seconds.
 */
export async function getVideoDuration(inputPath: string): Promise<number> {
  const command = `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${inputPath}"`;
  const result = await runCommand(command);
  return parseFloat(result.stdout);
}

/**
 * Convert video to different format using ffmpeg.
 *
 * @param {string} inputPath - Path to the input video file.
 * @param {string} outputPath - Path for the output video file.
 * @param {string} _format - Target video format (default: 'mp4').
 * @param {string} preset - Encoding preset for quality/speed trade-off (default: 'fast').
 * @param {((percentage: number, currentTime: number, totalTime: number) => void) | null} onProgress - Optional callback function for progress updates.
 *
 * @returns {Promise<void>} Promise that resolves when conversion is complete.
 *
 * @throws {Error} If ffmpeg execution fails or input file is invalid.
 */
export async function convertVideo(
  inputPath: string,
  outputPath: string,
  _format = 'mp4',
  preset = 'fast',
  onProgress?: (percentage: number, currentTime: number, totalTime: number) => void
): Promise<void> {
  const shouldProceed = await checkAndPromptOverwrite([outputPath]);
  if (!shouldProceed) {
    process.exit(0);
  }

  const presetMap: Record<string, string> = {
    ultrafast: 'ultrafast',
    fast: 'fast',
    medium: 'medium',
    slow: 'slow',
    'high-quality': 'slow',
  };

  const ffmpegPreset = presetMap[preset.toLowerCase()] || 'fast';

  const command = `ffmpeg -y -i "${inputPath}" -c:v libx264 -preset ${ffmpegPreset} -c:a aac "${outputPath}"`;

  const totalTime = await getVideoDuration(inputPath);

  await runCommand(command, createFFmpegProgressCallback(totalTime, onProgress));
}

/**
 * Compress video using ffmpeg with CRF (Constant Rate Factor).
 *
 * @param {string} inputPath - Path to the input video file.
 * @param {string} outputPath - Path for the output video file.
 * @param {number} crf - Compression quality factor, 0-51 (lower = better quality, default: 28).
 * @param {string} preset - Encoding preset for quality/speed trade-off (default: 'medium').
 * @param {((percentage: number, currentTime: number, totalTime: number) => void) | null} onProgress - Optional callback function for progress updates.
 *
 * @returns {Promise<void>} Promise that resolves when compression is complete.
 *
 * @throws {Error} If ffmpeg execution fails or input file is invalid.
 */
export async function compressVideo(
  inputPath: string,
  outputPath: string,
  crf = 28,
  preset = 'medium',
  onProgress?: (percentage: number, currentTime: number, totalTime: number) => void
): Promise<void> {
  const shouldProceed = await checkAndPromptOverwrite([outputPath]);
  if (!shouldProceed) {
    process.exit(0);
  }

  const command = `ffmpeg -y -i "${inputPath}" -c:v libx264 -crf ${crf} -preset ${preset} -c:a copy "${outputPath}"`;

  const totalTime = await getVideoDuration(inputPath);

  await runCommand(command, createFFmpegProgressCallback(totalTime, onProgress));
}

/**
 * Build an ffmpeg atempo audio filter chain for rates outside the single-filter range.
 *
 * @param {number} rate - Target playback speed rate.
 * @param {(a: number, b: number) => number} limit - Math.min for speedup, Math.max for slowdown.
 * @param {number} bound - Upper bound (2) for speedup or lower bound (0.5) for slowdown.
 *
 * @returns {string[]} Array of atempo filter strings to chain.
 */
function buildAtempoChain(rate: number, limit: (a: number, b: number) => number, bound: number): string[] {
  const chains: string[] = [];
  let remaining = rate;
  const isSpeedUp = rate > 1;
  while (isSpeedUp ? remaining > 1 : remaining < 1) {
    const factor = limit(bound, remaining);
    chains.push(`atempo=${factor}`);
    remaining /= factor;
  }
  return chains;
}

/**
 * Build audio filter string for speed adjustment.
 *
 * @param {number} rate - Target playback speed rate.
 *
 * @returns {string} Audio filter argument (e.g., '-af "atempo=2.0"') or empty string for normal range.
 */
function buildAudioFilter(rate: number): string {
  if (rate >= 0.5 && rate <= 2.0) {
    return `-af "atempo=${rate}"`;
  }
  if (rate > 2.0) {
    return `-af "${buildAtempoChain(rate, Math.min, 2).join(',')}"`;
  }
  if (rate < 0.5) {
    return `-af "${buildAtempoChain(rate, Math.max, 0.5).join(',')}"`;
  }
  return '';
}

/**
 * Speed up or slow down video playback using ffmpeg.
 *
 * @param {string} inputPath - Path to the input video file.
 * @param {string} outputPath - Path for the output video file.
 * @param {number} rate - Playback speed rate (1.0 = normal, 2.0 = 2x faster, 0.5 = 2x slower).
 * @param {((percentage: number, currentTime: number, totalTime: number) => void) | null} onProgress - Optional callback function for progress updates.
 *
 * @returns {Promise<void>} Promise that resolves when speed adjustment is complete.
 *
 * @throws {Error} If ffmpeg execution fails or input file is invalid.
 */
export async function speedUpVideo(
  inputPath: string,
  outputPath: string,
  rate = 2,
  onProgress?: (percentage: number, currentTime: number, totalTime: number) => void
): Promise<void> {
  const shouldProceed = await checkAndPromptOverwrite([outputPath]);
  if (!shouldProceed) {
    process.exit(0);
  }

  const audioFilter = buildAudioFilter(rate);
  const videoFilter = `-vf "setpts=${1 / rate}*PTS"`;
  const command = `ffmpeg -y -i "${inputPath}" ${videoFilter} ${audioFilter} -c:v libx264 -c:a aac "${outputPath}"`;

  const totalTime = await getVideoDuration(inputPath);

  await runCommand(command, createFFmpegProgressCallback(totalTime, onProgress));
}

/**
 * Extract audio track from video using ffmpeg.
 *
 * @param {string} inputPath - Path to the input video file.
 * @param {string} outputPath - Path for the output audio file.
 * @param {string} format - Audio format: 'mp3', 'wav', or 'aac' (default: 'mp3').
 * @param {string} bitrate - Audio bitrate (default: '192k').
 * @param {(percentage: number) => void} onProgress - Progress callback.
 *
 * @returns {Promise<void>} Promise that resolves when audio extraction is complete.
 *
 * @throws {Error} If ffmpeg execution fails or input file is invalid.
 */
export async function extractAudio(
  inputPath: string,
  outputPath: string,
  format = 'mp3',
  bitrate = '192k',
  onProgress?: (percentage: number) => void
): Promise<void> {
  const formatMap: Record<string, string> = { mp3: 'mp3', wav: 'wav', aac: 'adts' };

  const codecMap: Record<string, string> = { mp3: 'libmp3lame', wav: 'pcm_s16le', aac: 'aac' };

  const ffmpegFormat = formatMap[format.toLowerCase()];
  const ffmpegCodec = codecMap[format.toLowerCase()];

  const shouldProceed = await checkAndPromptOverwrite([outputPath]);
  if (!shouldProceed) {
    process.exit(0);
  }

  const command = `ffmpeg -y -i "${inputPath}" -vn -acodec ${ffmpegCodec} -b:a ${bitrate} -f ${ffmpegFormat} "${outputPath}"`;

  const totalTime = await getVideoDuration(inputPath);

  await runCommand(command, createFFmpegProgressCallback(totalTime, onProgress));
}
