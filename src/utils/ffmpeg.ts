import { runCommand } from '@/utils/dependencies';
import { parseFFmpegProgress } from '@/utils/progress';
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
  onProgress: ((percentage: number, currentTime: number, totalTime: number) => void) | null = null
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

  let totalTime = 0;
  let currentTime = 0;

  const outputHandler = (data: string, type: 'stdout' | 'stderr') => {
    if (type === 'stderr') {
      const progress = parseFFmpegProgress(data);
      if (progress && progress.type === 'time' && progress.value !== undefined) {
        currentTime = progress.value;
        if (totalTime > 0 && onProgress) {
          const percentage = Math.min(100, Math.round((currentTime / totalTime) * 100));
          onProgress(percentage, currentTime, totalTime);
        }
      }
    }
  };

  // First, get total duration
  const infoCommand = `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${inputPath}"`;
  const infoResult = await runCommand(infoCommand);
  totalTime = parseFloat(infoResult.stdout);

  // Then convert
  await runCommand(command, outputHandler);
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
  onProgress: ((percentage: number, currentTime: number, totalTime: number) => void) | null = null
): Promise<void> {
  const shouldProceed = await checkAndPromptOverwrite([outputPath]);
  if (!shouldProceed) {
    process.exit(0);
  }

  const command = `ffmpeg -y -i "${inputPath}" -c:v libx264 -crf ${crf} -preset ${preset} -c:a copy "${outputPath}"`;

  let totalTime = 0;
  let currentTime = 0;

  const outputHandler = (data: string, type: 'stdout' | 'stderr') => {
    if (type === 'stderr') {
      const progress = parseFFmpegProgress(data);
      if (progress && progress.type === 'time' && progress.value !== undefined) {
        currentTime = progress.value;
        if (totalTime > 0 && onProgress) {
          const percentage = Math.min(100, Math.round((currentTime / totalTime) * 100));
          onProgress(percentage, currentTime, totalTime);
        }
      }
    }
  };

  // First, get total duration
  const infoCommand = `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${inputPath}"`;
  const infoResult = await runCommand(infoCommand);
  totalTime = parseFloat(infoResult.stdout);

  // Then compress
  await runCommand(command, outputHandler);
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
  onProgress: ((percentage: number, currentTime: number, totalTime: number) => void) | null = null
): Promise<void> {
  // For audio, use atempo filter (limited to 0.5-2.0 per filter chain)
  // For video, use setpts filter

  let audioFilter = '';
  if (rate >= 0.5 && rate <= 2.0) {
    audioFilter = `-af "atempo=${rate}"`;
  } else if (rate > 2.0) {
    // Chain multiple atempo filters for rates > 2
    const chains: string[] = [];
    let remaining = rate;
    while (remaining > 1) {
      const factor = Math.min(2, remaining);
      chains.push(`atempo=${factor}`);
      remaining /= factor;
    }
    audioFilter = `-af "${chains.join(',')}"`;
  } else if (rate < 0.5) {
    // Chain multiple atempo filters for rates < 0.5
    const chains: string[] = [];
    let remaining = rate;
    while (remaining < 1) {
      const factor = Math.max(0.5, remaining);
      chains.push(`atempo=${factor}`);
      remaining /= factor;
    }
    audioFilter = `-af "${chains.join(',')}"`;
  }

  const videoFilter = `-vf "setpts=${1 / rate}*PTS"`;

  const shouldProceed = await checkAndPromptOverwrite([outputPath]);
  if (!shouldProceed) {
    process.exit(0);
  }

  const command = `ffmpeg -y -i "${inputPath}" ${videoFilter} ${audioFilter} -c:v libx264 -c:a aac "${outputPath}"`;

  let totalTime = 0;
  let currentTime = 0;

  const outputHandler = (data: string, type: 'stdout' | 'stderr') => {
    if (type === 'stderr') {
      const progress = parseFFmpegProgress(data);
      if (progress && progress.type === 'time' && progress.value !== undefined) {
        currentTime = progress.value;
        if (totalTime > 0 && onProgress) {
          const percentage = Math.min(100, Math.round((currentTime / totalTime) * 100));
          onProgress(percentage, currentTime, totalTime);
        }
      }
    }
  };

  // First, get total duration
  const infoCommand = `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${inputPath}"`;
  const infoResult = await runCommand(infoCommand);
  totalTime = parseFloat(infoResult.stdout);

  // Then speed up
  await runCommand(command, outputHandler);
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

  let totalTime = 0;
  let currentTime = 0;

  const outputHandler = (data: string, type: 'stdout' | 'stderr') => {
    if (type === 'stderr' && onProgress) {
      const progress = parseFFmpegProgress(data);
      if (progress && progress.type === 'time' && progress.value !== undefined) {
        currentTime = progress.value;
        if (totalTime > 0) {
          const percentage = Math.min(100, Math.round((currentTime / totalTime) * 100));
          onProgress(percentage);
        }
      }
    }
  };

  // First, get total duration
  const infoCommand = `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${inputPath}"`;
  const infoResult = await runCommand(infoCommand);
  totalTime = parseFloat(infoResult.stdout);

  // Then extract audio
  await runCommand(command, outputHandler);
}
