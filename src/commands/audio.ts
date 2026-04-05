import { resolve, dirname, basename, extname, join } from 'path';

import type { Command } from 'commander';

import type { AudioOptions } from '@/types/index';
import { ensureDependencies } from '@/utils/dependencies';
import { extractAudio } from '@/utils/ffmpeg';
import { loading } from '@/utils/icons';
import { log } from '@/utils/log';
import { createProgressBar } from '@/utils/progress';
import { validateFileExists, validateFormat, validateBitrate } from '@/utils/validations';

/* Allowed audio formats for extraction */
const ALLOWED_FORMATS = ['mp3', 'wav', 'aac'];

/**
 * Extract audio track from video using ffmpeg
 *
 * @param {string} input - Path to input video file
 * @param {AudioOptions} options - Audio extraction options including output, format, and bitrate
 * @returns {Promise<void>}
 * @throws {void} Exits with code 1 on error
 */
export async function audioAction(input: string, options: AudioOptions): Promise<void> {
  try {
    log.loading('Preparing audio extraction...');

    await ensureDependencies();

    try {
      await validateFileExists(input);
    } catch (error) {
      log.fail(error instanceof Error ? error.message : String(error));
      process.exit(1);
    }

    const format = options.format || 'mp3';
    try {
      validateFormat(format, ALLOWED_FORMATS);
    } catch (error) {
      log.fail(error instanceof Error ? error.message : String(error));
      process.exit(1);
    }

    const bitrate = options.bitrate || '192k';
    try {
      validateBitrate(bitrate);
    } catch (error) {
      log.fail(error instanceof Error ? error.message : String(error));
      process.exit(1);
    }

    let outputFile = options.output;
    // check: if output path not provided, generate default
    if (!outputFile) {
      const dir = dirname(input);
      const name = basename(input, extname(input));
      outputFile = join(dir, `${name}.${format}`);
    }

    log.succeed(`Audio extraction started | Format: ${format.toUpperCase()} | Bitrate: ${bitrate}`);

    const progressBar = createProgressBar(`${loading} Extracting audio | ${format.toUpperCase()}`);

    progressBar.start(100, 0);

    try {
      await extractAudio(input, outputFile, format, bitrate, (progress) => {
        if (progress > 0) {
          progressBar.update(progress);
        }
      });
    } catch (error) {
      progressBar.stop();
      log.fail(`Audio extraction failed: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }

    progressBar.stop();

    log.succeed('Audio extraction completed!');
    log.info(`Output: ${resolve(outputFile)}`);
  } catch (error) {
    log.fail(error instanceof Error ? error.message : String(error));
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
