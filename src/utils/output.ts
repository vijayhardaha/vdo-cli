import { dirname, basename, extname, join } from 'path';

/**
 * Resolve output file path based on input file and optional format
 *
 * If output is provided:
 *   - If format is provided and output extension doesn't match format, append format extension
 *   - Otherwise use output as-is
 *
 * If output is not provided:
 *   - Generate default filename using suffix and format/extension
 *
 * @param {string} input - Path to input file
 * @param {Object} options - Resolution options
 * @param {string | undefined} options.output - User-provided output path (optional)
 * @param {string | undefined} options.format - Target format extension (e.g., 'mp4', 'avi')
 * @param {string} options.suffix - Suffix for auto-generated filenames (e.g., '_converted', '_compressed')
 * @returns {string} Resolved output file path
 */
export function resolveOutputFile({
  input,
  output,
  format,
  suffix,
}: {
  input: string;
  output?: string;
  format?: string;
  suffix: string;
}): string {
  if (output) {
    // check: if format is provided and output extension doesn't match, append it
    if (format) {
      const outputExt = extname(output).slice(1);
      return outputExt === format ? output : `${output}.${format}`;
    }
    return output;
  }

  // Generate default output filename
  const dir = dirname(input);
  const name = basename(input, extname(input));
  const ext = format || extname(input).slice(1) || 'mp4';
  return join(dir, `${name}${suffix}.${ext}`);
}
