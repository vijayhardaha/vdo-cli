export interface ProgressInfo {
  type: 'time' | 'size' | 'fps' | 'download' | 'destination';
  value?: number;
  percentage?: number;
  size?: number;
  unit?: string;
  filename?: string;
}

export interface DependencyCheck {
  ok: boolean;
  missing: string[];
}

export interface CommandResult {
  stdout: string;
  stderr: string;
}

export type VideoFormat = 'mp4' | 'mkv' | 'avi' | 'mov' | 'webm' | 'flv';
export type AudioFormat = 'mp3' | 'wav' | 'aac';
export type DownloadFormat = 'mp4' | 'mkv' | 'mp3';
export type Preset = 'ultrafast' | 'fast' | 'medium' | 'slow' | 'high-quality';

export interface DownloadOptions {
  output?: string;
  format?: DownloadFormat;
}

export interface ConvertOptions {
  output?: string;
  to?: VideoFormat;
  preset?: Preset;
}

export interface CompressOptions {
  output?: string;
  crf?: number;
  preset?: 'ultrafast' | 'fast' | 'medium' | 'slow';
}

export interface SpeedupOptions {
  output?: string;
  rate?: number;
}

export interface AudioOptions {
  output?: string;
  format?: AudioFormat;
  bitrate?: string;
}

export interface AutoOptions {
  output?: string;
  format?: DownloadFormat;
}
