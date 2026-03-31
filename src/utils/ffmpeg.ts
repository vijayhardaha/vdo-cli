import { runCommand } from './dependencies.js';
import { parseFFmpegProgress } from './progress.js';

/**
 * Convert video to different format using ffmpeg
 * @param inputPath - Input file path
 * @param outputPath - Output file path
 * @param format - Target format
 * @param preset - Encoding preset
 * @param onProgress - Progress callback
 * @returns Promise<void>
 */
export async function convertVideo(
  inputPath: string,
  outputPath: string,
  format = 'mp4',
  preset = 'fast',
  onProgress: ((percentage: number, currentTime: number, totalTime: number) => void) | null = null
): Promise<void> {
  const presetMap: Record<string, string> = {
    ultrafast: 'ultrafast',
    fast: 'fast',
    medium: 'medium',
    slow: 'slow',
    'high-quality': 'slow',
  };

  const ffmpegPreset = presetMap[preset.toLowerCase()] || 'fast';

  const command = `ffmpeg -i "${inputPath}" -c:v libx264 -preset ${ffmpegPreset} -c:a aac -f ${format} "${outputPath}"`;

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
 * Compress video using ffmpeg
 * @param inputPath - Input file path
 * @param outputPath - Output file path
 * @param crf - CRF value (0-51)
 * @param preset - Encoding preset
 * @param onProgress - Progress callback
 * @returns Promise<void>
 */
export async function compressVideo(
  inputPath: string,
  outputPath: string,
  crf = 28,
  preset = 'medium',
  onProgress: ((percentage: number, currentTime: number, totalTime: number) => void) | null = null
): Promise<void> {
  const command = `ffmpeg -i "${inputPath}" -c:v libx264 -crf ${crf} -preset ${preset} -c:a copy "${outputPath}"`;

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
 * Speed up or slow down video
 * @param inputPath - Input file path
 * @param outputPath - Output file path
 * @param rate - Speed rate (1 = normal, 2 = 2x faster, 0.5 = 2x slower)
 * @param onProgress - Progress callback
 * @returns Promise<void>
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
  const command = `ffmpeg -i "${inputPath}" ${videoFilter} ${audioFilter} -c:v libx264 -c:a aac "${outputPath}"`;

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
 * Extract audio from video
 * @param inputPath - Input file path
 * @param outputPath - Output file path
 * @param format - Audio format (mp3, wav, aac)
 * @param bitrate - Audio bitrate
 * @returns Promise<void>
 */
export async function extractAudio(
  inputPath: string,
  outputPath: string,
  format = 'mp3',
  bitrate = '192k'
): Promise<void> {
  const formatMap: Record<string, string> = {
    mp3: 'mp3',
    wav: 'wav',
    aac: 'adts',
  };

  const codecMap: Record<string, string> = {
    mp3: 'libmp3lame',
    wav: 'pcm_s16le',
    aac: 'aac',
  };

  const ffmpegFormat = formatMap[format.toLowerCase()];
  const ffmpegCodec = codecMap[format.toLowerCase()];

  const command = `ffmpeg -i "${inputPath}" -vn -acodec ${ffmpegCodec} -b:a ${bitrate} -f ${ffmpegFormat} "${outputPath}"`;

  await runCommand(command);
}
