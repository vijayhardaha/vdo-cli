import { runCommand } from '@/utils/dependencies';
import { parseYtDlpProgress } from '@/utils/progress';
import { sanitizeFilename } from '@/utils/sanitize';

/* Video information returned from yt-dlp */
export interface VideoInfo {
  title: string;
  video_id: string;
  ext: string;
  filesize?: number;
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
    const filesize = data.filesize || data.filesize_approx;

    return { title, video_id, ext, filesize };
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
 * @param {string} [cookies] - Browser name to load cookies from (for authenticated downloads)
 * @returns {Promise<void>} Promise that resolves when download is complete
 * @throws {Error} If yt-dlp execution fails, URL is invalid, or network error occurs
 */
export async function downloadVideo(
  url: string,
  outputPath: string,
  format: string = 'mp4',
  onProgress: ((percentage: number, size: number, unit: string) => void) | null = null,
  cookies?: string
): Promise<void> {
  const mergeFormat = format.toLowerCase() || 'mp4';

  const cookiesFlag = cookies ? `--cookies-from-browser ${cookies}` : '';

  let command: string;
  /* check: if downloading audio only */
  if (format === 'mp3') {
    command = `yt-dlp ${cookiesFlag} --extract-audio --audio-format mp3 --audio-quality 0 --output "${outputPath}" --format bestaudio/best "${url}"`;
  } else {
    command = `yt-dlp ${cookiesFlag} -S vcodec:h264,acodec:aac,quality -f b --merge-output-format ${mergeFormat} --output "${outputPath}" "${url}"`;
  }

  const outputHandler = (data: string, _type: 'stdout' | 'stderr') => {
    const progress = parseYtDlpProgress(data);
    /* check: if progress data is available and callback exists */
    if (progress && progress.type === 'download' && onProgress) {
      onProgress(progress.percentage || 0, progress.size || 0, progress.unit || 'MiB');
    }
  };

  await runCommand(command, outputHandler);
}
