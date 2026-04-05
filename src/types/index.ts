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
 * Quality preset for compact command
 */
export type CompactQuality = 'low' | 'medium' | 'high' | 'lossless';

/**
 * Options for compact command
 */
export interface CompactOptions {
  output?: string;
  target?: string;
  percent?: number;
  quality?: CompactQuality;
  preset?: 'ultrafast' | 'fast' | 'medium' | 'slow';
  audioBitrate?: string;
  hevc?: boolean;
  discord?: boolean;
}

/**
 * Segment definition for slice command
 */
export interface SliceSegment {
  start: string;
  end: string;
}

/**
 * Options for slice command
 */
export interface SliceOptions {
  output?: string;
  start?: string;
  end?: string;
  duration?: string;
  segments?: SliceSegment[];
  fast?: boolean;
  precise?: boolean;
  codec?: 'copy' | 'h264' | 'hevc';
}
