import { access } from 'fs/promises';
import { extname, dirname, basename, join } from 'path';

/**
 * Validate if a file exists.
 *
 * @param {string} filePath - Path to the file to check.
 *
 * @returns {Promise<void>} Promise that resolves if file exists.
 *
 * @throws {Error} With message "File not found: {filePath}" if file does not exist.
 */
export async function validateFileExists(filePath: string): Promise<void> {
  try {
    await access(filePath);
  } catch {
    throw new Error(`File not found: ${filePath}`);
  }
}

/**
 * Validate if a URL is valid (HTTP or HTTPS protocol).
 *
 * @param {string} url - URL string to validate.
 *
 * @returns {boolean} True if URL is valid HTTP or HTTPS URL, false otherwise.
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
 * Validate format option against allowed formats.
 *
 * @param {string} format - Format string to validate.
 * @param {string[]} allowedFormats - Array of allowed format strings.
 *
 * @returns {void}
 *
 * @throws {Error} If format is not in the allowed formats list.
 */
export function validateFormat(format: string, allowedFormats: string[]): void {
  if (!allowedFormats.includes(format.toLowerCase())) {
    throw new Error(`Invalid format "${format}". Allowed formats: ${allowedFormats.join(', ')}`);
  }
}

/**
 * Validate preset option against allowed presets.
 *
 * @param {string} preset - Preset string to validate.
 * @param {string[]} allowedPresets - Array of allowed preset strings.
 *
 * @returns {void}
 *
 * @throws {Error} If preset is not in the allowed presets list.
 */
export function validatePreset(preset: string, allowedPresets: string[]): void {
  if (!allowedPresets.includes(preset.toLowerCase())) {
    throw new Error(`Invalid preset "${preset}". Allowed presets: ${allowedPresets.join(', ')}`);
  }
}

/**
 * Validate CRF (Constant Rate Factor) value.
 *
 * @param {number | string} crf - CRF value to validate (number or string).
 *
 * @returns {void}
 *
 * @throws {Error} If CRF is not a number or is outside the valid range 0-51.
 */
export function validateCRF(crf: number | string): void {
  const crfValue = typeof crf === 'string' ? parseInt(crf, 10) : crf;
  if (isNaN(crfValue) || crfValue < 0 || crfValue > 51) {
    throw new Error('CRF value must be between 0 and 51');
  }
}

/**
 * Validate speed rate value.
 *
 * @param {number | string} rate - Speed rate to validate (number or string).
 *
 * @returns {void}
 *
 * @throws {Error} If rate is not a number or is outside the valid range (>0 and ≤16).
 */
export function validateSpeedRate(rate: number | string): void {
  const rateValue = typeof rate === 'string' ? parseFloat(rate) : rate;
  if (isNaN(rateValue) || rateValue <= 0 || rateValue > 16) {
    throw new Error('Speed rate must be greater than 0 and at most 16');
  }
}

/**
 * Validate bitrate format.
 *
 * @param {string} bitrate - Bitrate string to validate (e.g., "192k", "128M").
 *
 * @returns {void}
 *
 * @throws {Error} If bitrate format is invalid (must be number optionally followed by k, K, m, or M).
 */
export function validateBitrate(bitrate: string): void {
  const bitrateRegex = /^\d+[kKmM]?$/;
  if (!bitrateRegex.test(bitrate)) {
    throw new Error('Bitrate must be a number optionally followed by k, K, m, or M (e.g., 192k, 128M)');
  }
}

/**
 * Get file extension from path.
 *
 * @param {string} filePath - File path to extract extension from.
 *
 * @returns {string} Lowercase file extension without the dot, or empty string if no extension.
 */
export function getFileExtension(filePath: string): string {
  return extname(filePath).slice(1).toLowerCase();
}

/**
 * Generate output filename based on input path and desired format.
 *
 * @param {string} inputPath - Original input file path.
 * @param {string} format - Desired output format (extension).
 *
 * @returns {string} Generated output file path with new format extension in same directory.
 */
export function generateOutputFilename(inputPath: string, format: string): string {
  const dir = dirname(inputPath);
  const name = basename(inputPath, extname(inputPath));
  return join(dir, `${name}.${format.toLowerCase()}`);
}
