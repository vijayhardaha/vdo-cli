/**
 * Progress information for ffmpeg or yt-dlp operations
 */
export interface ProgressInfo {
  type: 'time' | 'size' | 'fps' | 'download' | 'destination';
  value?: number;
  percentage?: number;
  size?: number;
  unit?: string;
  filename?: string;
}

/**
 * Dependency check result
 */
export interface DependencyCheck {
  ok: boolean;
  missing: string[];
}

/**
 * Command execution result with stdout and stderr
 */
export interface CommandResult {
  stdout: string;
  stderr: string;
}

/**
 * Supported video formats
 */
export type VideoFormat = 'mp4' | 'mkv' | 'avi' | 'mov' | 'webm' | 'flv';

/**
 * Supported audio formats
 */
export type AudioFormat = 'mp3' | 'wav' | 'aac';

/**
 * Supported download formats
 */
export type DownloadFormat = 'mp4' | 'mkv' | 'mp3';

/**
 * FFmpeg encoding presets
 */
export type Preset = 'ultrafast' | 'fast' | 'medium' | 'slow' | 'high-quality';

/**
 * Options for download command
 */
export interface DownloadOptions {
  output?: string;
  format?: DownloadFormat;
}

/**
 * Options for convert command
 */
export interface ConvertOptions {
  output?: string;
  to?: VideoFormat;
  preset?: Preset;
}

/**
 * Options for compress command
 */
export interface CompressOptions {
  output?: string;
  crf?: number;
  preset?: 'ultrafast' | 'fast' | 'medium' | 'slow';
}

/**
 * Options for speedup command
 */
export interface SpeedupOptions {
  output?: string;
  rate?: number;
}

/**
 * Options for audio extraction command
 */
export interface AudioOptions {
  output?: string;
  format?: AudioFormat;
  bitrate?: string;
}

/**
 * Options for auto command
 */
export interface AutoOptions {
  output?: string;
  format?: DownloadFormat;
}
