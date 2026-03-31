import { runCommand } from './dependencies.js';
import { parseYtDlpProgress } from './progress.js';

/**
 * Download video from URL using yt-dlp
 *
 * @param url - Video URL to download (must be HTTP or HTTPS)
 * @param outputPath - Path for the output video file
 * @param format - Desired output format: 'mp4', 'mkv', or 'mp3' (default: 'mp4')
 * @param onProgress - Optional callback function for download progress updates
 * @returns Promise that resolves when download is complete
 * @throws Error if yt-dlp execution fails, URL is invalid, or network error occurs
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
 * Get detailed video information from URL using yt-dlp
 *
 * @param url - Video URL to fetch information from
 * @returns Promise containing video metadata object with title, duration, and other details
 * @throws Error if yt-dlp execution fails or JSON parsing fails
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
 * Check if a URL is supported by yt-dlp
 *
 * @param url - URL to check for support (must be HTTP or HTTPS)
 * @returns Promise<boolean> - True if URL appears to be supported, false otherwise
 * @throws Never throws errors; returns false on any failure
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
