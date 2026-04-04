import { resolve, dirname, basename, extname, join } from 'path';

import type { Command } from 'commander';
import ora from 'ora';

import type { ConvertOptions } from '../types/index.js';
import { checkDependencies } from '../utils/dependencies.js';
import { convertVideo } from '../utils/ffmpeg.js';
import { createProgressBar } from '../utils/progress.js';
import { validateFileExists, validateFormat, validatePreset } from '../utils/validations.js';

const ALLOWED_FORMATS = ['mp4', 'mkv', 'avi', 'mov', 'webm', 'flv'];
const ALLOWED_PRESETS = ['ultrafast', 'fast', 'medium', 'slow', 'high-quality'];

/**
 * Convert action - converts video to different format using ffmpeg
 *
 * @param {string} input - Path to the input video file
 * @param {ConvertOptions} options - Conversion configuration options including output filename, target format, and preset
 * @returns {Promise<void>} Promise that resolves when conversion is complete
 * @throws {void} Exits process with code 1 if dependencies missing, file not found, or conversion fails
 */
export async function convertAction(input: string, options: ConvertOptions): Promise<void> {
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
    const format = options.to || 'mp4';
    validateFormat(format, ALLOWED_FORMATS);

    // Validate preset
    const preset = options.preset || 'fast';
    validatePreset(preset, ALLOWED_PRESETS);

    // Determine output filename
    let outputFile = options.output;
    if (!outputFile) {
      const dir = dirname(input);
      const name = basename(input, extname(input));
      outputFile = join(dir, `${name}_converted.${format}`);
    }

    // Show spinner while preparing
    const spinner = ora('Preparing conversion...').start();
    spinner.succeed('Conversion started');

    const progressBar = createProgressBar('Converting');

    const progressCallback = (percentage: number) => {
      if (progressBar && percentage > 0) {
        progressBar.update(percentage);
      }
    };

    progressBar.start(100, 0);

    // Convert video
    await convertVideo(input, outputFile, format, preset, progressCallback);

    progressBar.stop();
    console.log('\n✓ Conversion completed successfully!');
    console.log(`  Output file: ${resolve(outputFile)}`);
    console.log(`  Format: ${format.toUpperCase()}`);
    console.log(`  Preset: ${preset}`);
  } catch (error) {
    console.error('\n✗ Error:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

/**
 * Setup convert command with Commander.js
 *
 * @param {Command} program - Commander program instance to register the command on
 * @returns {void}
 */
export function setupConvert(program: Command): void {
  program
    .command('convert <input>')
    .alias('cv')
    .description('Convert local video to different format')
    .option('-o, --output <file>', 'Output file name')
    .option('--to <format>', 'Target format (mp4, mkv, avi, mov, webm, flv)', 'mp4')
    .option('--preset <preset>', 'Encoding preset (ultrafast, fast, medium, slow, high-quality)', 'fast')
    .action(convertAction);
}
