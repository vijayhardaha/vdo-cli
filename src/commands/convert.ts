import { resolve, dirname, basename, extname, join } from 'path';

import type { Command } from 'commander';

import { loading } from '@/utils/icons.js';

import type { ConvertOptions } from '../types/index.js';
import { checkDependencies } from '../utils/dependencies.js';
import { convertVideo } from '../utils/ffmpeg.js';
import { log } from '../utils/log.js';
import { createProgressBar } from '../utils/progress.js';
import { validateFileExists, validateFormat, validatePreset } from '../utils/validations.js';

const ALLOWED_FORMATS = ['mp4', 'mkv', 'avi', 'mov', 'webm', 'flv'];
const ALLOWED_PRESETS = ['ultrafast', 'fast', 'medium', 'slow', 'high-quality'];

export async function convertAction(input: string, options: ConvertOptions): Promise<void> {
  try {
    log.loading('Preparing conversion...');

    const deps = await checkDependencies();
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

    const format = options.to || 'mp4';
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
    if (!outputFile) {
      const dir = dirname(input);
      const name = basename(input, extname(input));
      outputFile = join(dir, `${name}_converted.${format}`);
    }

    log.succeed('Conversion started');

    const progressBar = createProgressBar(`${loading} Converting`);

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
    log.info(`Format: ${format.toUpperCase()}`);
    log.info(`Preset: ${preset}`);
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
    .option('--to <format>', 'Target format (mp4, mkv, avi, mov, webm, flv)', 'mp4')
    .option('--preset <preset>', 'Encoding preset (ultrafast, fast, medium, slow, high-quality)', 'fast')
    .action(convertAction);
}
