import { access } from 'fs/promises';
import { extname, dirname, basename, join } from 'path';

/**
 * Validate if a file exists
 * @param filePath - Path to the file
 * @throws Error If file doesn't exist
 */
export async function validateFileExists(filePath: string): Promise<void> {
  try {
    await access(filePath);
  } catch {
    throw new Error(`File not found: ${filePath}`);
  }
}

/**
 * Validate if a URL is valid
 * @param url - URL to validate
 * @returns boolean
 */
export function validateUrl(url: string): boolean {
  try {
    const parsedUrl = new URL(url);
    return parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Validate format option
 * @param format - Format to validate
 * @param allowedFormats - Allowed formats
 * @throws Error If format is not allowed
 */
export function validateFormat(format: string, allowedFormats: string[]): void {
  if (!allowedFormats.includes(format.toLowerCase())) {
    throw new Error(`Invalid format "${format}". Allowed formats: ${allowedFormats.join(', ')}`);
  }
}

/**
 * Validate preset option
 * @param preset - Preset to validate
 * @param allowedPresets - Allowed presets
 * @throws Error If preset is not allowed
 */
export function validatePreset(preset: string, allowedPresets: string[]): void {
  if (!allowedPresets.includes(preset.toLowerCase())) {
    throw new Error(`Invalid preset "${preset}". Allowed presets: ${allowedPresets.join(', ')}`);
  }
}

/**
 * Validate CRF value
 * @param crf - CRF value to validate
 * @throws Error If CRF is out of range
 */
export function validateCRF(crf: number | string): void {
  const crfValue = typeof crf === 'string' ? parseInt(crf, 10) : crf;
  if (isNaN(crfValue) || crfValue < 0 || crfValue > 51) {
    throw new Error('CRF value must be between 0 and 51');
  }
}

/**
 * Validate speed rate
 * @param rate - Speed rate to validate
 * @throws Error If rate is out of range
 */
export function validateSpeedRate(rate: number | string): void {
  const rateValue = typeof rate === 'string' ? parseFloat(rate) : rate;
  if (isNaN(rateValue) || rateValue <= 0 || rateValue > 16) {
    throw new Error('Speed rate must be greater than 0 and at most 16');
  }
}

/**
 * Validate bitrate
 * @param bitrate - Bitrate to validate
 * @throws Error If bitrate format is invalid
 */
export function validateBitrate(bitrate: string): void {
  const bitrateRegex = /^\d+[kKmM]?$/;
  if (!bitrateRegex.test(bitrate)) {
    throw new Error(
      'Bitrate must be a number optionally followed by k, K, m, or M (e.g., 192k, 128M)'
    );
  }
}

/**
 * Get file extension from path
 * @param filePath - File path
 * @returns string
 */
export function getFileExtension(filePath: string): string {
  return extname(filePath).slice(1).toLowerCase();
}

/**
 * Generate output filename based on format
 * @param inputPath - Input file path
 * @param format - Desired format
 * @returns string
 */
export function generateOutputFilename(inputPath: string, format: string): string {
  const dir = dirname(inputPath);
  const name = basename(inputPath, extname(inputPath));
  return join(dir, `${name}.${format.toLowerCase()}`);
}
