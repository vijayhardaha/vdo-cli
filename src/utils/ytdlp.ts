import { runCommand } from './dependencies.js';
import { parseYtDlpProgress } from './progress.js';
import { sanitizeFilename } from './sanitize.js';

export interface VideoInfo {
  title: string;
  video_id: string;
  ext: string;
}

/**
 * Get video information from URL using yt-dlp
 *
 * @param {string} url - Video URL to fetch information from
 * @returns {Promise<VideoInfo>} Promise containing video title, video_id, and extension
 * @throws {Error} If yt-dlp execution fails or JSON parsing fails
 */
export async function getVideoInfo(url: string): Promise<VideoInfo> {
  const command = `yt-dlp --dump-json --no-download "${url}"`;
  const result = await runCommand(command);

  try {
    const data = JSON.parse(result.stdout);
    const title = sanitizeFilename(data.title || 'untitled');
    const video_id = data.display_id || data.id || 'unknown';
    const ext = data.ext || 'mp4';

    return { title, video_id, ext };
  } catch {
    throw new Error('Failed to parse video information');
  }
}

/**
 * Generate a proper filename for the downloaded video
 *
 * @param {VideoInfo} videoInfo - Video information containing title and video_id
 * @param {string} format - Desired output format
 * @returns {string} Generated filename
 */
export function generateFilename(videoInfo: VideoInfo, format: string): string {
  const ext = format === 'mp3' ? 'mp3' : format;
  return `${videoInfo.title}_${videoInfo.video_id}.${ext}`;
}

/**
 * Download video from URL using yt-dlp
 *
 * @param {string} url - Video URL to download (must be HTTP or HTTPS)
 * @param {string} outputPath - Path for the output video file
 * @param {string} [format='mp4'] - Desired output format: 'mp4', 'mkv', or 'mp3' (default: 'mp4')
 * @param {((percentage: number, size: number, unit: string) => void) | null} [onProgress=null] - Optional callback function for download progress updates
 * @returns {Promise<void>} Promise that resolves when download is complete
 * @throws {Error} If yt-dlp execution fails, URL is invalid, or network error occurs
 */
export async function downloadVideo(
  url: string,
  outputPath: string,
  format: string = 'mp4',
  onProgress: ((percentage: number, size: number, unit: string) => void) | null = null
): Promise<void> {
  const formatMap: Record<string, string> = {
    mp4: 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/bestvideo[ext=mp4]/best',
    mkv: 'bestvideo[ext=mkv]+bestaudio[ext=mka]/bestvideo[ext=mkv]/best',
    webm: 'bestvideo[ext=webm]+bestaudio[ext=webm]/bestvideo[ext=webm]/best',
    avi: 'bestvideo[ext=avi]+bestaudio[ext=avi]/bestvideo[ext=avi]/best',
    mov: 'bestvideo[ext=mov]+bestaudio[ext=m4a]/bestvideo[ext=mov]/best',
    mp3: 'bestaudio/best',
  };

  const formatSelector = formatMap[format.toLowerCase()] || formatMap.mp4;

  let command: string;
  if (format === 'mp3') {
    command = `yt-dlp --extract-audio --audio-format mp3 --output "${outputPath}" --format "${formatSelector}" "${url}"`;
  } else {
    command = `yt-dlp --output "${outputPath}" --format "${formatSelector}" "${url}"`;
  }

  const outputHandler = (data: string, _type: 'stdout' | 'stderr') => {
    const progress = parseYtDlpProgress(data);
    if (progress && progress.type === 'download' && onProgress) {
      onProgress(progress.percentage || 0, progress.size || 0, progress.unit || 'MiB');
    }
  };

  await runCommand(command, outputHandler);
}
