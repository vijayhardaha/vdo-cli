import { access } from 'fs/promises';
import { extname, dirname, basename, join } from 'path';

/**
 * Validate if a file exists
 *
 * @param filePath - Path to the file to check
 * @returns Promise that resolves if file exists
 * @throws Error with message "File not found: {filePath}" if file does not exist
 */
export async function validateFileExists(filePath: string): Promise<void> {
  try {
    await access(filePath);
  } catch {
    throw new Error(`File not found: ${filePath}`);
  }
}

/**
 * Validate if a URL is valid (HTTP or HTTPS protocol)
 *
 * @param url - URL string to validate
 * @returns True if URL is valid HTTP or HTTPS URL, false otherwise
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
 * Validate format option against allowed formats
 *
 * @param format - Format string to validate
 * @param allowedFormats - Array of allowed format strings
 * @returns void
 * @throws Error if format is not in the allowed formats list
 */
export function validateFormat(format: string, allowedFormats: string[]): void {
  if (!allowedFormats.includes(format.toLowerCase())) {
    throw new Error(`Invalid format "${format}". Allowed formats: ${allowedFormats.join(', ')}`);
  }
}

/**
 * Validate preset option against allowed presets
 *
 * @param preset - Preset string to validate
 * @param allowedPresets - Array of allowed preset strings
 * @returns void
 * @throws Error if preset is not in the allowed presets list
 */
export function validatePreset(preset: string, allowedPresets: string[]): void {
  if (!allowedPresets.includes(preset.toLowerCase())) {
    throw new Error(`Invalid preset "${preset}". Allowed presets: ${allowedPresets.join(', ')}`);
  }
}

/**
 * Validate CRF (Constant Rate Factor) value
 *
 * @param crf - CRF value to validate (number or string)
 * @returns void
 * @throws Error if CRF is not a number or is outside the valid range 0-51
 */
export function validateCRF(crf: number | string): void {
  const crfValue = typeof crf === 'string' ? parseInt(crf, 10) : crf;
  if (isNaN(crfValue) || crfValue < 0 || crfValue > 51) {
    throw new Error('CRF value must be between 0 and 51');
  }
}

/**
 * Validate speed rate value
 *
 * @param rate - Speed rate to validate (number or string)
 * @returns void
 * @throws Error if rate is not a number or is outside the valid range (>0 and ≤16)
 */
export function validateSpeedRate(rate: number | string): void {
  const rateValue = typeof rate === 'string' ? parseFloat(rate) : rate;
  if (isNaN(rateValue) || rateValue <= 0 || rateValue > 16) {
    throw new Error('Speed rate must be greater than 0 and at most 16');
  }
}

/**
 * Validate bitrate format
 *
 * @param bitrate - Bitrate string to validate (e.g., "192k", "128M")
 * @returns void
 * @throws Error if bitrate format is invalid (must be number optionally followed by k, K, m, or M)
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
 *
 * @param filePath - File path to extract extension from
 * @returns Lowercase file extension without the dot, or empty string if no extension
 */
export function getFileExtension(filePath: string): string {
  return extname(filePath).slice(1).toLowerCase();
}

/**
 * Generate output filename based on input path and desired format
 *
 * @param inputPath - Original input file path
 * @param format - Desired output format (extension)
 * @returns Generated output file path with new format extension in same directory
 */
export function generateOutputFilename(inputPath: string, format: string): string {
  const dir = dirname(inputPath);
  const name = basename(inputPath, extname(inputPath));
  return join(dir, `${name}.${format.toLowerCase()}`);
}
