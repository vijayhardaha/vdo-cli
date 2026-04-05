import { resolve, dirname, basename, extname, join } from 'path';

import type { Command } from 'commander';

import { loading } from '@/utils/icons';

import type { ConvertOptions } from '../types/index';
import { checkDependencies } from '../utils/dependencies';
import { convertVideo } from '../utils/ffmpeg';
import { log } from '../utils/log';
import { createProgressBar } from '../utils/progress';
import { validateFileExists, validateFormat, validatePreset } from '../utils/validations';

/* Allowed video formats for conversion */
const ALLOWED_FORMATS = ['mp4', 'mkv', 'avi', 'mov', 'webm', 'flv'];
/* Allowed encoding presets for ffmpeg */
const ALLOWED_PRESETS = ['ultrafast', 'fast', 'medium', 'slow', 'high-quality'];

/**
 * Convert video to different format using ffmpeg
 *
 * @param {string} input - Path to input video file
 * @param {ConvertOptions} options - Conversion options including output, format, and preset
 * @returns {Promise<void>}
 * @throws {void} Exits with code 1 on error
 */
export async function convertAction(input: string, options: ConvertOptions): Promise<void> {
  try {
    log.loading('Preparing conversion...');

    const deps = await checkDependencies();
    // check: if dependencies are missing
    if (!deps.ok) {
      log.fail(`Missing dependencies: ${deps.missing.join(', ')}`);
      log.warn('Install using: brew install ffmpeg yt-dlp');
      process.exit(1);
    }

    try {
      await validateFileExists(input);
    } catch (error) {
      log.fail(error instanceof Error ? error.message : String(error));
      process.exit(1);
    }

    const format = options.format || 'mp4';
    try {
      validateFormat(format, ALLOWED_FORMATS);
    } catch (error) {
      log.fail(error instanceof Error ? error.message : String(error));
      process.exit(1);
    }

    const preset = options.preset || 'fast';
    try {
      validatePreset(preset, ALLOWED_PRESETS);
    } catch (error) {
      log.fail(error instanceof Error ? error.message : String(error));
      process.exit(1);
    }

    let outputFile = options.output;
    // check: if output path not provided, generate default
    if (!outputFile) {
      const dir = dirname(input);
      const name = basename(input, extname(input));
      outputFile = join(dir, `${name}_converted.${format}`);
    }

    log.succeed(`Conversion started | Format: ${format.toUpperCase()} | Preset: ${preset}`);

    const progressBar = createProgressBar(`${loading} Converting | ${format.toUpperCase()} | ${preset}`);

    const progressCallback = (percentage: number) => {
      if (progressBar && percentage > 0) {
        progressBar.update(percentage);
      }
    };

    progressBar.start(100, 0);

    try {
      await convertVideo(input, outputFile, format, preset, progressCallback);
    } catch (error) {
      progressBar.stop();
      log.fail(`Conversion failed: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }

    progressBar.stop();
    log.succeed('Conversion completed successfully!');
    log.info(`Output: ${resolve(outputFile)}`);
  } catch (error) {
    log.fail(error instanceof Error ? error.message : String(error));
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
    .option('-f, --format <format>', 'Target format (mp4, mkv, avi, mov, webm, flv)', 'mp4')
    .option('--preset <preset>', 'Encoding preset (ultrafast, fast, medium, slow, high-quality)', 'fast')
    .action(convertAction);
}
