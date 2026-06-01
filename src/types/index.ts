/**
 * Progress information for ffmpeg or yt-dlp operations.
 *
 * @type {ProgressInfo}
 * @property {'time' | 'size' | 'fps' | 'download' | 'destination'} type - Type of progress event.
 * @property {number} [value] - Numeric value associated with the progress.
 * @property {number} [percentage] - Completion percentage if available.
 * @property {number} [size] - File size in bytes if applicable.
 * @property {string} [unit] - Unit string for the size value.
 * @property {string} [filename] - Output filename for download operations.
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
 * Dependency check result.
 *
 * @type {DependencyCheck}
 * @property {boolean} ok - Whether all dependencies are installed.
 * @property {string[]} missing - List of missing dependency names.
 */
export interface DependencyCheck {
  ok: boolean;
  missing: string[];
}

/**
 * Command execution result with stdout and stderr.
 *
 * @type {CommandResult}
 * @property {string} stdout - Standard output from the command.
 * @property {string} stderr - Standard error from the command.
 */
export interface CommandResult {
  stdout: string;
  stderr: string;
}

/**
 * Supported video formats.
 *
 * @type {VideoFormat}
 */
export type VideoFormat = 'mp4' | 'mkv' | 'avi' | 'mov' | 'webm' | 'flv';

/**
 * Supported audio formats.
 *
 * @type {AudioFormat}
 */
export type AudioFormat = 'mp3' | 'wav' | 'aac';

/**
 * Supported download formats.
 *
 * @type {DownloadFormat}
 */
export type DownloadFormat = 'mp4' | 'mkv' | 'mp3';

/**
 * FFmpeg encoding presets.
 *
 * @type {Preset}
 */
export type Preset = 'ultrafast' | 'fast' | 'medium' | 'slow' | 'high-quality';

/**
 * Options for download command.
 *
 * @type {DownloadOptions}
 * @property {string} [output] - Custom output file path.
 * @property {DownloadFormat} [format] - Target download format.
 * @property {boolean} [convert] - Whether to convert after download.
 * @property {string} [split] - Split value after download.
 * @property {string} [cookies] - Browser name for cookie loading.
 */
export interface DownloadOptions {
  output?: string;
  format?: DownloadFormat;
  convert?: boolean;
  split?: string;
  cookies?: string;
}

/**
 * Options for convert command.
 *
 * @type {ConvertOptions}
 * @property {string} [output] - Custom output file path.
 * @property {VideoFormat} [format] - Target video format.
 * @property {Preset} [preset] - Encoding preset for conversion.
 */
export interface ConvertOptions {
  output?: string;
  format?: VideoFormat;
  preset?: Preset;
}

/**
 * Options for compress command.
 *
 * @type {CompressOptions}
 * @property {string} [output] - Custom output file path.
 * @property {number} [crf] - Constant Rate Factor value (0-51).
 * @property {'ultrafast' | 'fast' | 'medium' | 'slow'} [preset] - Encoding preset for compression.
 */
export interface CompressOptions {
  output?: string;
  crf?: number;
  preset?: 'ultrafast' | 'fast' | 'medium' | 'slow';
}

/**
 * Options for speedup command.
 *
 * @type {SpeedupOptions}
 * @property {string} [output] - Custom output file path.
 * @property {number} [rate] - Speed multiplier factor.
 */
export interface SpeedupOptions {
  output?: string;
  rate?: number;
}

/**
 * Options for audio extraction command.
 *
 * @type {AudioOptions}
 * @property {string} [output] - Custom output file path.
 * @property {AudioFormat} [format] - Target audio format.
 * @property {string} [bitrate] - Audio bitrate string (e.g., '192k').
 */
export interface AudioOptions {
  output?: string;
  format?: AudioFormat;
  bitrate?: string;
}

/**
 * Quality preset for compact command.
 *
 * @type {CompactQuality}
 */
export type CompactQuality = 'low' | 'medium' | 'high' | 'lossless';

/**
 * Options for compact command.
 *
 * @type {CompactOptions}
 * @property {string} [output] - Custom output file path.
 * @property {string} [target] - Target file size string (e.g., '10MB').
 * @property {number} [percent] - Target size reduction percentage.
 * @property {CompactQuality} [quality] - Quality preset for encoding.
 * @property {'ultrafast' | 'fast' | 'medium' | 'slow'} [preset] - Encoding preset for compaction.
 * @property {string} [audioBitrate] - Audio bitrate for output.
 * @property {boolean} [hevc] - Whether to use HEVC codec.
 * @property {boolean} [discord] - Whether to target Discord file size limit.
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
 * Segment definition for slice command.
 *
 * @type {SliceSegment}
 * @property {string} start - Start time string (e.g., '00:01:30').
 * @property {string} end - End time string (e.g., '00:02:00').
 */
export interface SliceSegment {
  start: string;
  end: string;
}

/**
 * Options for slice command.
 *
 * @type {SliceOptions}
 * @property {string} [output] - Custom output file path.
 * @property {string} [start] - Start time for slicing.
 * @property {string} [end] - End time for slicing.
 * @property {string} [duration] - Duration for slicing.
 * @property {SliceSegment[]} [segments] - Array of segments for batch slicing.
 * @property {boolean} [fast] - Use stream copy for speed.
 * @property {boolean} [precise] - Use re-encoding for frame accuracy.
 * @property {'copy' | 'h264' | 'hevc'} [codec] - Codec for re-encoding.
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

/**
 * Platform preset for split command.
 *
 * @type {SplitPreset}
 */
export type SplitPreset = 'instagram' | 'ig' | 'whatsapp' | 'wa' | 'facebook' | 'fb';

/**
 * Options for split command.
 *
 * @type {SplitOptions}
 * @property {string} [output] - Custom output file path.
 * @property {SplitPreset} [preset] - Platform preset for split duration.
 * @property {string} [duration] - Custom duration per segment.
 * @property {boolean} [fast] - Use stream copy for speed.
 * @property {boolean} [precise] - Use re-encoding for frame accuracy.
 * @property {'h264' | 'hevc'} [codec] - Codec for re-encoding.
 */
export interface SplitOptions {
  output?: string;
  preset?: SplitPreset;
  duration?: string;
  fast?: boolean;
  precise?: boolean;
  codec?: 'h264' | 'hevc';
}
