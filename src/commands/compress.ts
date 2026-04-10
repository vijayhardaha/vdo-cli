import { resolve } from 'path';

import type { Command } from 'commander';

import type { CompressOptions } from '@/types/index';
import { ensureDependencies } from '@/utils/dependencies';
import { compressVideo } from '@/utils/ffmpeg';
import { loading } from '@/utils/icons';
import { log } from '@/utils/log';
import { resolveOutputFile } from '@/utils/output';
import { createProgressBar, createProgressCallback } from '@/utils/progress';
import { validateFileExists, validatePreset, validateCRF } from '@/utils/validations';

/* Allowed encoding presets for compression */
const ALLOWED_PRESETS = ['ultrafast', 'fast', 'medium', 'slow'];

/**
 * Compress video to reduce file size using ffmpeg with CRF
 *
 * @param {string} input - Path to input video file
 * @param {CompressOptions} options - Compression options including output, CRF, and preset
 * @returns {Promise<void>}
 * @throws {void} Exits with code 1 on error
 */
export async function compressAction(input: string, options: CompressOptions): Promise<void> {
  try {
    log.loading('Preparing compression...');

    await ensureDependencies();

    try {
      await validateFileExists(input);
    } catch (error) {
      log.fail(error instanceof Error ? error.message : String(error));
      process.exit(1);
    }

    const crf = options.crf || 28;
    try {
      validateCRF(crf);
    } catch (error) {
      log.fail(error instanceof Error ? error.message : String(error));
      process.exit(1);
    }

    const preset = options.preset || 'medium';
    try {
      validatePreset(preset, ALLOWED_PRESETS);
    } catch (error) {
      log.fail(error instanceof Error ? error.message : String(error));
      process.exit(1);
    }

    const outputFile = resolveOutputFile({ input, output: options.output, suffix: '_compressed' });

    log.succeed(`Compression started | CRF: ${crf} | Preset: ${preset}`);

    const progressBar = createProgressBar(`${loading} Compressing | CRF: ${crf} | ${preset}`);
    const progressCallback = createProgressCallback(progressBar);

    progressBar.start(100, 0);

    try {
      await compressVideo(input, outputFile, crf, preset, progressCallback);
    } catch (error) {
      progressBar.stop();
      log.fail(`Compression failed: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }

    progressBar.stop();
    log.succeed('Compression completed successfully!');
    log.info(`Output: ${resolve(outputFile)}`);
  } catch (error) {
    log.fail(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

/**
 * Setup compress command with Commander.js
 *
 * @param {Command} program - Commander program instance to register the command on
 * @returns {void}
 */
export function setupCompress(program: Command): void {
  program
    .command('compress <input>')
    .alias('cps')
    .description('Compress video to reduce file size')
    .option('-o, --output <file>', 'Output file name')
    .option('--crf <value>', 'Constant Rate Factor (0-51, lower = better quality)', '28')
    .option('--preset <preset>', 'Encoding preset (ultrafast, fast, medium, slow)', 'medium')
    .action(compressAction);
}
