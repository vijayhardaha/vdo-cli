import { resolve } from 'path';

import type { Command } from 'commander';

import type { SpeedupOptions } from '@/types/index';
import { ensureDependencies } from '@/utils/dependencies';
import { speedUpVideo } from '@/utils/ffmpeg';
import { loading } from '@/utils/icons';
import { log } from '@/utils/log';
import { resolveOutputFile } from '@/utils/output';
import { createProgressBar, createProgressCallback } from '@/utils/progress';
import { validateFileExists, validateSpeedRate } from '@/utils/validations';

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

    await ensureDependencies();

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

    const outputFile = resolveOutputFile({ input, output: options.output, suffix: `_${rate}x` });

    log.succeed(`Speed adjustment started | Rate: ${rate}x`);

    const progressBar = createProgressBar(`${loading} Processing | ${rate}x`);
    const progressCallback = createProgressCallback(progressBar);

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
    .alias('sup')
    .description('Speed up or slow down video')
    .option('-o, --output <file>', 'Output file name')
    .option('--rate <value>', 'Speed rate (e.g., 2 for 2x faster, 0.5 for 2x slower)', '2')
    .action(speedupAction);
}
