import { resolve, dirname, basename, extname, join } from 'path';

import type { Command } from 'commander';

import { loading } from '@/utils/icons.js';

import type { SpeedupOptions } from '../types/index.js';
import { checkDependencies } from '../utils/dependencies.js';
import { speedUpVideo } from '../utils/ffmpeg.js';
import { log } from '../utils/log.js';
import { createProgressBar } from '../utils/progress.js';
import { validateFileExists, validateSpeedRate } from '../utils/validations.js';

/**
 * Speed up or slow down video playback using ffmpeg
 *
 * @param {string} input - Path to input video file
 * @param {SpeedupOptions} options - Speed adjustment options including output and rate
 * @returns {Promise<void>}
 * @throws {void} Exits with code 1 on error
 */
export async function speedupAction(input: string, options: SpeedupOptions): Promise<void> {
  try {
    log.loading('Preparing speed adjustment...');

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

    const rate = options.rate || 2;
    try {
      validateSpeedRate(rate);
    } catch (error) {
      log.fail(error instanceof Error ? error.message : String(error));
      process.exit(1);
    }

    let outputFile = options.output;
    // check: if output path not provided, generate default
    if (!outputFile) {
      const dir = dirname(input);
      const name = basename(input, extname(input));
      outputFile = join(dir, `${name}_${rate}x.mp4`);
    }

    log.succeed('Speed adjustment started');

    const progressBar = createProgressBar(`${loading} Processing`);

    const progressCallback = (percentage: number) => {
      if (progressBar && percentage > 0) {
        progressBar.update(percentage);
      }
    };

    progressBar.start(100, 0);

    try {
      await speedUpVideo(input, outputFile, rate, progressCallback);
    } catch (error) {
      progressBar.stop();
      log.fail(`Speed adjustment failed: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }

    progressBar.stop();
    log.succeed('Speed adjustment completed successfully!');
    log.info(`Output: ${resolve(outputFile)}`);
    log.info(`Speed rate: ${rate}x`);

    // check: if video should be sped up
    if (rate > 1) {
      log.info(`Result: Video is ${rate}x faster`);
      // check: if video should be slowed down
    } else if (rate < 1) {
      log.info(`Result: Video is ${(1 / rate).toFixed(2)}x slower`);
    }
  } catch (error) {
    log.fail(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

/**
 * Setup speedup command with Commander.js
 *
 * @param {Command} program - Commander program instance to register the command on
 * @returns {void}
 */
export function setupSpeedup(program: Command): void {
  program
    .command('speedup <input>')
    .alias('sp')
    .description('Speed up or slow down video')
    .option('-o, --output <file>', 'Output file name')
    .option('--rate <value>', 'Speed rate (e.g., 2 for 2x faster, 0.5 for 2x slower)', '2')
    .action(speedupAction);
}
