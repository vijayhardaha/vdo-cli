import { resolve, dirname, basename, extname } from 'path';

import type { Command } from 'commander';

import { loading } from '@/utils/icons';

import type { SplitOptions, SplitPreset } from '../types/index';
import { checkDependencies } from '../utils/dependencies';
import { getVideoDuration } from '../utils/ffmpeg';
import { log } from '../utils/log';
import { createProgressBar } from '../utils/progress';
import {
  splitVideoReencode,
  splitVideoStreamCopy,
  parseDuration,
  getPresetDuration,
  calculateNumParts,
} from '../utils/split';
import { validateFileExists } from '../utils/validations';

/* Default codec */
const DEFAULT_CODEC: 'h264' | 'hevc' = 'h264';
/* Default CRF */
const DEFAULT_CRF = 23;

/**
 * Split video into multiple parts
 *
 * @param {string} input - Path to input video file
 * @param {SplitOptions} options - Split options including preset, duration, mode
 * @returns {Promise<void>}
 * @throws {void} Exits with code 1 on error
 */
export async function splitAction(input: string, options: SplitOptions): Promise<void> {
  try {
    log.loading('Preparing split operation...');

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

    // Validation: must have either preset or duration, but not both
    if (options.preset && options.duration) {
      log.fail('Cannot use both --preset and --duration. Please choose one.');
      process.exit(1);
    }

    // Validation: must have at least one
    if (!options.preset && !options.duration) {
      log.fail('Please provide either --preset or --duration option.');
      process.exit(1);
    }

    // Determine part duration
    let partDuration: number;

    if (options.preset) {
      partDuration = getPresetDuration(options.preset as SplitPreset);
    } else {
      partDuration = parseDuration(options.duration!);
      if (partDuration <= 0) {
        log.fail('Duration must be greater than 0.');
        process.exit(1);
      }
    }

    // Get video duration
    const totalDuration = await getVideoDuration(input);
    const numParts = calculateNumParts(totalDuration, partDuration);

    if (numParts <= 1) {
      log.info(`Video is ${Math.round(totalDuration)}s long, no splitting needed (max part: ${partDuration}s).`);
      log.info('Use --duration to set a smaller max part size if needed.');
      return;
    }

    const codec = options.codec === 'hevc' ? 'hevc' : 'h264';
    const mode = options.fast ? 'fast' : 'precise';

    log.succeed(`Split started | ${numParts} parts | Max: ${partDuration}s | Mode: ${mode}`);

    const dir = dirname(input);
    const ext = extname(input);
    const baseName = basename(input, ext);

    const progressBar = createProgressBar(`${loading} Splitting | ${numParts} parts`);

    progressBar.start(100, 0);

    try {
      let outputPaths: string[];

      if (options.fast) {
        outputPaths = await splitVideoStreamCopy(
          input,
          dir,
          baseName,
          partDuration,
          totalDuration,
          (progress: number, part: number) => {
            progressBar.update(Math.round(progress), { part, total: numParts });
          }
        );
      } else {
        outputPaths = await splitVideoReencode(
          input,
          dir,
          baseName,
          partDuration,
          totalDuration,
          codec,
          DEFAULT_CRF,
          (progress: number, part: number) => {
            progressBar.update(Math.round(progress), { part, total: numParts });
          }
        );
      }

      progressBar.stop();
      log.succeed('Split completed successfully!');
      for (const outputPath of outputPaths) {
        log.info(`Output: ${resolve(outputPath)}`);
      }
    } catch (error) {
      progressBar.stop();
      log.fail(`Split failed: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  } catch (error) {
    log.fail(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

/**
 * Setup split command with Commander.js
 *
 * @param {Command} program - Commander program instance to register the command on
 * @returns {void}
 */
export function setupSplit(program: Command): void {
  program
    .command('split <input>')
    .alias('spl')
    .description('Split video into multiple parts')
    .option('-o, --output <file>', 'Output directory or base name')
    .option('-p, --preset <platform>', 'Platform preset: instagram/ig (60s), whatsapp/wa (90s), facebook/fb (120s)')
    .option('-d, --duration <time>', 'Max duration per part (e.g., 60, 1:30, 00:01:30)')
    .option('--fast', 'Use stream copy (fast, may not be frame-accurate)')
    .option('--precise', 'Re-encode for frame accuracy (default)')
    .option('--codec <codec>', 'Codec for re-encoding (h264, hevc)', DEFAULT_CODEC)
    .action(splitAction);
}
