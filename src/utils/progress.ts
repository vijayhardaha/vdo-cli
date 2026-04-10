import cliProgress from 'cli-progress';

import type { ProgressInfo } from '@/types/index';

/**
 * Create a progress bar instance for displaying CLI progress
 *
 * @param {string} [message='Processing'] - Message to display above the progress bar (default: 'Processing')
 * @param {string} [unit='%'] - Unit to display after size values (default: '%' for percentage-based)
 * @returns {cliProgress.SingleBar} New cli-progress SingleBar instance configured with classic shades preset
 */
/**
 * Create a progress callback for updating and rendering a progress bar
 *
 * @param {cliProgress.SingleBar} progressBar - The progress bar to update
 * @returns {(percentage: number) => void} Callback function that updates and renders the progress bar
 */
export function createProgressCallback(progressBar: cliProgress.SingleBar): (percentage: number) => void {
  return (percentage: number) => {
    if (progressBar && percentage > 0) {
      progressBar.update(percentage);
      progressBar.render();
    }
  };
}

export function createProgressBar(message = 'Processing', unit = '%'): cliProgress.SingleBar {
  const format =
    unit === '%' ? `${message} [{bar}] {percentage}%` : `${message} [{bar}] {percentage}% | {value}/{total} ${unit}`;
  return new cliProgress.SingleBar(
    { format, barCompleteChar: '█', barIncompleteChar: '░', hideCursor: true },
    cliProgress.Presets.shades_classic
  );
}

/**
 * Parse ffmpeg output line to extract progress information
 *
 * @param {string} line - Single output line from ffmpeg stderr
 * @returns {ProgressInfo | null} ProgressInfo object with time, size, or fps data if matched; null if no progress found
 */
export function parseFFmpegProgress(line: string): ProgressInfo | null {
  // Match time progress
  const timeMatch = line.match(/time=(\d{2}):(\d{2}):(\d{2})\.(\d{2})/);
  if (timeMatch) {
    const hours = parseInt(timeMatch[1], 10);
    const minutes = parseInt(timeMatch[2], 10);
    const seconds = parseInt(timeMatch[3], 10);
    const totalSeconds = hours * 3600 + minutes * 60 + seconds;
    return { type: 'time', value: totalSeconds };
  }

  // Match size/speed progress
  const sizeMatch = line.match(/size=\s*(\d+)kB/);
  if (sizeMatch) {
    const sizeKB = parseInt(sizeMatch[1], 10);
    return { type: 'size', value: sizeKB };
  }

  // Match fps
  const fpsMatch = line.match(/fps=(\d+)/);
  if (fpsMatch) {
    const fps = parseInt(fpsMatch[1], 10);
    return { type: 'fps', value: fps };
  }

  return null;
}

/**
 * Parse yt-dlp output line to extract download progress information
 *
 * @param {string} line - Single output line from yt-dlp stdout/stderr
 * @returns {ProgressInfo | null} ProgressInfo object with download percentage and size if matched; null if no progress found
 */
export function parseYtDlpProgress(line: string): ProgressInfo | null {
  // Match percentage: [download]  45.3% of 100.00MiB
  const percentMatch = line.match(/(\d+\.?\d*)%\s+of\s+(\d+\.?\d*)(MiB|KiB|GiB)/);
  if (percentMatch) {
    const percentage = parseFloat(percentMatch[1]);
    const size = parseFloat(percentMatch[2]);
    const unit = percentMatch[3];
    return { type: 'download', percentage, size, unit };
  }

  // Match destination file
  const destMatch = line.match(/\[download\]\s+Destination:\s+(.+)/);
  if (destMatch) {
    return { type: 'destination', filename: destMatch[1] };
  }

  return null;
}

/**
 * Convert kilobytes to megabytes
 *
 * @param {number} kb - Size in kilobytes
 * @returns {number} Size in megabytes
 */
export function kbToMB(kb: number): number {
  return kb / 1024;
}

/**
 * Convert various size units to megabytes
 *
 * @param {number} size - Numeric size value
 * @param {string} unit - Unit of measurement ('KiB', 'MiB', 'GiB', or other)
 * @returns {number} Size converted to megabytes
 */
export function formatFileSize(bytes: number): { value: number; unit: string } {
  if (bytes < 1024) return { value: bytes, unit: 'B' };
  if (bytes < 1024 * 1024) return { value: bytes / 1024, unit: 'KB' };
  if (bytes < 1024 * 1024 * 1024) return { value: bytes / (1024 * 1024), unit: 'MB' };
  if (bytes < 1024 * 1024 * 1024 * 1024) return { value: bytes / (1024 * 1024 * 1024), unit: 'GB' };
  return { value: bytes / (1024 * 1024 * 1024 * 1024), unit: 'TB' };
}
