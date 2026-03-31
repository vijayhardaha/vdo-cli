import { runCommand } from './dependencies.js';
import { parseYtDlpProgress } from './progress.js';

/**
 * Download video from URL using yt-dlp
 * @param url - Video URL
 * @param outputPath - Output file path
 * @param format - Desired format (mp4, mkv, mp3)
 * @param onProgress - Progress callback
 * @returns Promise<void>
 */
export async function downloadVideo(
  url: string,
  outputPath: string,
  format = 'mp4',
  onProgress: ((percentage: number, size: number, unit: string) => void) | null = null
): Promise<void> {
  const formatMap: Record<string, string> = {
    mp4: 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
    mkv: 'bestvideo[ext=mkv]+bestaudio[ext=mka]/best[ext=mkv]/best',
    mp3: 'bestaudio/best',
  };

  const formatSelector = formatMap[format.toLowerCase()] || formatMap.mp4;

  let command: string;
  if (format === 'mp3') {
    // Extract audio only
    command = `yt-dlp --extract-audio --audio-format mp3 --output "${outputPath}" --format "${formatSelector}" "${url}"`;
  } else {
    command = `yt-dlp --output "${outputPath}" --format "${formatSelector}" "${url}"`;
  }

  const outputHandler = (data: string, type: 'stdout' | 'stderr') => {
    if (type === 'stderr' || type === 'stdout') {
      const progress = parseYtDlpProgress(data);
      if (progress && progress.type === 'download' && onProgress) {
        onProgress(progress.percentage || 0, progress.size || 0, progress.unit || 'MiB');
      }
    }
  };

  await runCommand(command, outputHandler);
}

/**
 * Get video info from URL
 * @param url - Video URL
 * @returns Promise<unknown> Video information
 */
export async function getVideoInfo(url: string): Promise<unknown> {
  const command = `yt-dlp --dump-json "${url}"`;
  const result = await runCommand(command);

  try {
    return JSON.parse(result.stdout);
  } catch {
    throw new Error('Failed to parse video information');
  }
}

/**
 * Check if URL is supported by yt-dlp
 * @param url - URL to check
 * @returns Promise<boolean>
 */
export async function isSupportedURL(url: string): Promise<boolean> {
  try {
    const command = `yt-dlp --list-extractors`;
    await runCommand(command);
    // If we can run the command, yt-dlp supports some URLs
    // A more specific check would require parsing the URL
    return url.startsWith('http://') || url.startsWith('https://');
  } catch {
    return false;
  }
}
