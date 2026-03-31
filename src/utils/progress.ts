import cliProgress from 'cli-progress';
import type { ProgressInfo } from '../types/index.js';

/**
 * Create a progress bar instance
 * @param message - Progress bar message
 * @returns cliProgress.SingleBar instance
 */
export function createProgressBar(message = 'Processing'): cliProgress.SingleBar {
  return new cliProgress.SingleBar(
    {
      format: `${message} [{bar}] {percentage}% | {value}/{total} MB`,
      barCompleteChar: '█',
      barIncompleteChar: '░',
      hideCursor: true,
    },
    cliProgress.Presets.shades_classic
  );
}

/**
 * Parse ffmpeg progress output
 * @param line - Output line from ffmpeg
 * @returns ProgressInfo or null
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
 * Parse yt-dlp progress output
 * @param line - Output line from yt-dlp
 * @returns ProgressInfo or null
 */
export function parseYtDlpProgress(line: string): ProgressInfo | null {
  // Match percentage: [download]  45.3% of 100.00MiB
  const percentMatch = line.match(/(\d+\.?\d*)%\s+of\s+(\d+\.?\d*)(MiB|KiB|GiB)/);
  if (percentMatch) {
    const percentage = parseFloat(percentMatch[1]);
    const size = parseFloat(percentMatch[2]);
    const unit = percentMatch[3];
    return {
      type: 'download',
      percentage,
      size,
      unit,
    };
  }

  // Match destination file
  const destMatch = line.match(/\[download\]\s+Destination:\s+(.+)/);
  if (destMatch) {
    return { type: 'destination', filename: destMatch[1] };
  }

  return null;
}

/**
 * Convert KB to MB
 * @param kb - Size in KB
 * @returns Size in MB
 */
export function kbToMB(kb: number): number {
  return kb / 1024;
}

/**
 * Convert KiB/GiB to MB
 * @param size - Size value
 * @param unit - Unit (KiB, MiB, GiB)
 * @returns Size in MB
 */
export function convertToMB(size: number, unit: string): number {
  switch (unit) {
    case 'KiB':
      return size / 1024;
    case 'MiB':
      return size;
    case 'GiB':
      return size * 1024;
    default:
      return size;
  }
}
