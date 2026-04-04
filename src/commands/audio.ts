import { resolve, dirname, basename, extname, join } from 'path';

import type { Command } from 'commander';

import type { AudioOptions } from '../types/index.js';
import { checkDependencies } from '../utils/dependencies.js';
import { extractAudio } from '../utils/ffmpeg.js';
import { log } from '../utils/log.js';
import { validateFileExists, validateFormat, validateBitrate } from '../utils/validations.js';

const ALLOWED_FORMATS = ['mp3', 'wav', 'aac'];

export async function audioAction(input: string, options: AudioOptions): Promise<void> {
  try {
    log.spinner('Preparing audio extraction...');

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
    if (!outputFile) {
      const dir = dirname(input);
      const name = basename(input, extname(input));
      outputFile = join(dir, `${name}.${format}`);
    }

    log.succeed('Audio extraction started');

    try {
      await extractAudio(input, outputFile, format, bitrate);
    } catch (error) {
      log.fail(`Audio extraction failed: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }

    log.succeed('Audio extraction completed!');
    log.info(`Output: ${resolve(outputFile)}`);
    log.info(`Format: ${format.toUpperCase()}`);
    log.info(`Bitrate: ${bitrate}`);
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
