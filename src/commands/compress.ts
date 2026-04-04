import { resolve, dirname, basename, extname, join } from 'path';

import type { Command } from 'commander';

import type { CompressOptions } from '../types/index.js';
import { checkDependencies } from '../utils/dependencies.js';
import { compressVideo } from '../utils/ffmpeg.js';
import { log } from '../utils/log.js';
import { createProgressBar } from '../utils/progress.js';
import { validateFileExists, validatePreset, validateCRF } from '../utils/validations.js';

const ALLOWED_PRESETS = ['ultrafast', 'fast', 'medium', 'slow'];

export async function compressAction(input: string, options: CompressOptions): Promise<void> {
  try {
    log.spinner('Preparing compression...');

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

    let outputFile = options.output;
    if (!outputFile) {
      const dir = dirname(input);
      const name = basename(input, extname(input));
      outputFile = join(dir, `${name}_compressed.mp4`);
    }

    log.succeed('Compression started');

    const progressBar = createProgressBar('Compressing');

    const progressCallback = (percentage: number) => {
      if (progressBar && percentage > 0) {
        progressBar.update(percentage);
      }
    };

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
    log.info(`CRF: ${crf}`);
    log.info(`Preset: ${preset}`);
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
    .alias('cm')
    .description('Compress video to reduce file size')
    .option('-o, --output <file>', 'Output file name')
    .option('--crf <value>', 'Constant Rate Factor (0-51, lower = better quality)', '28')
    .option('--preset <preset>', 'Encoding preset (ultrafast, fast, medium, slow)', 'medium')
    .action(compressAction);
}
