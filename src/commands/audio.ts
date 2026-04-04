import { resolve, dirname, basename, extname, join } from 'path';

import type { Command } from 'commander';
import ora from 'ora';

import type { AudioOptions } from '../types/index.js';
import { checkDependencies } from '../utils/dependencies.js';
import { extractAudio } from '../utils/ffmpeg.js';
import { validateFileExists, validateFormat, validateBitrate } from '../utils/validations.js';

const ALLOWED_FORMATS = ['mp3', 'wav', 'aac'];

/**
 * Audio action - extracts audio track from video using ffmpeg
 *
 * @param {string} input - Path to the input video file
 * @param {AudioOptions} options - Audio extraction configuration options including output filename, format, and bitrate
 * @returns {Promise<void>} Promise that resolves when audio extraction is complete
 * @throws {void} Exits process with code 1 if dependencies missing, file not found, invalid format/bitrate, or extraction fails
 */
export async function audioAction(input: string, options: AudioOptions): Promise<void> {
  try {
    // Check dependencies
    const deps = await checkDependencies();
    if (!deps.ok) {
      console.error(`Error: Missing required dependencies: ${deps.missing.join(', ')}`);
      console.error('Please install them using:');
      console.error('  brew install ffmpeg yt-dlp');
      process.exit(1);
    }

    // Validate input file
    await validateFileExists(input);

    // Validate format
    const format = options.format || 'mp3';
    validateFormat(format, ALLOWED_FORMATS);

    // Validate bitrate
    const bitrate = options.bitrate || '192k';
    validateBitrate(bitrate);

    // Determine output filename
    let outputFile = options.output;
    if (!outputFile) {
      const dir = dirname(input);
      const name = basename(input, extname(input));
      outputFile = join(dir, `${name}.${format}`);
    }

    // Show spinner while processing
    const spinner = ora('Extracting audio...').start();

    // Extract audio
    await extractAudio(input, outputFile, format, bitrate);

    spinner.succeed('Audio extraction completed!');
    console.log(`  Output file: ${resolve(outputFile)}`);
    console.log(`  Format: ${format.toUpperCase()}`);
    console.log(`  Bitrate: ${bitrate}`);
  } catch (error) {
    console.error('\n✗ Error:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

/**
 * Setup audio command with Commander.js
 *
 * @param {Command} program - Commander program instance to register the command on
 * @returns {void}
 */
export function setupAudio(program: Command): void {
  program
    .command('audio <input>')
    .alias('au')
    .description('Extract audio from video')
    .option('-o, --output <file>', 'Output file name')
    .option('--format <format>', 'Audio format (mp3, wav, aac)', 'mp3')
    .option('--bitrate <value>', 'Audio bitrate (e.g., 192k, 128k)', '192k')
    .action(audioAction);
}
