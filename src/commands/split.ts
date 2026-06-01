import { resolve, dirname, basename, extname } from 'path';

import type { Command } from 'commander';

import type { SplitOptions, SplitPreset } from '@/types/index';
import { ensureDependencies } from '@/utils/dependencies';
import { getVideoDuration } from '@/utils/ffmpeg';
import { loading } from '@/utils/icons';
import { log, handleError } from '@/utils/log';
import { createProgressBar } from '@/utils/progress';
import { checkAndPromptOverwrite } from '@/utils/prompt';
import { parseTimeToSeconds } from '@/utils/slice';
import { splitVideoReencode, splitVideoStreamCopy, getPresetDuration, calculateNumParts } from '@/utils/split';
import { validateFileExists } from '@/utils/validations';

/**
 * Generate output file paths for split operation.
 *
 * @param {string} input - Input video file path.
 * @param {number} numParts - Number of parts to split into.
 *
 * @returns {string[]} Array of output file paths.
 */
function generateSplitOutputPaths(input: string, numParts: number): string[] {
  const dir = dirname(input);
  const ext = extname(input).slice(1) || 'mp4';
  const baseName = basename(input, extname(input));
  const outputPaths: string[] = [];

  for (let i = 0; i < numParts; i++) {
    const paddedIndex = String(i + 1).padStart(3, '0');
    outputPaths.push(`${dir}/${baseName}_${paddedIndex}.${ext}`);
  }

  return outputPaths;
}

/* Default codec */
const DEFAULT_CODEC: 'h264' | 'hevc' = 'h264';
/* Default CRF */
const DEFAULT_CRF = 23;

/**
 * Resolve part duration from options, validating inputs.
 *
 * @param {SplitOptions} options - Split options.
 *
 * @returns {number} Part duration in seconds.
 */
function resolvePartDuration(options: SplitOptions): number {
  if (options.preset && options.duration) {
    log.fail('Cannot use both --preset and --duration. Please choose one.');
    process.exit(1);
  }

  if (!options.preset && !options.duration) {
    log.fail('Please provide either --preset or --duration option.');
    process.exit(1);
  }

  if (options.preset) {
    return getPresetDuration(options.preset as SplitPreset);
  }

  const duration = parseTimeToSeconds(options.duration!);
  if (duration <= 0) {
    log.fail('Duration must be greater than 0.');
    process.exit(1);
  }

  return duration;
}

/**
 * Execute split with progress bar.
 *
 * @param {string} input - Input file path.
 * @param {string[]} outputPaths - Output file paths.
 * @param {number} partDuration - Duration per part.
 * @param {number} totalDuration - Total video duration.
 * @param {SplitOptions} options - Split options.
 *
 * @returns {Promise<void>}
 */
async function executeSplit(
  input: string,
  outputPaths: string[],
  partDuration: number,
  totalDuration: number,
  options: SplitOptions
): Promise<void> {
  const numParts = outputPaths.length;
  const codec = options.codec === 'hevc' ? 'hevc' : 'h264';
  const mode = options.fast ? 'fast' : 'precise';

  log.succeed(`Split started | ${numParts} parts | Max: ${partDuration}s | Mode: ${mode}`);

  const progressBar = createProgressBar(`${loading} Splitting | ${numParts} parts`);

  progressBar.start(100, 0);

  try {
    if (options.fast) {
      await splitVideoStreamCopy(input, outputPaths, partDuration, totalDuration, (progress, part) => {
        progressBar.update(Math.round(progress), { part, total: numParts });
        progressBar.render();
      });
    } else {
      await splitVideoReencode(
        input,
        outputPaths,
        partDuration,
        totalDuration,
        codec,
        DEFAULT_CRF,
        (progress, part) => {
          progressBar.update(Math.round(progress), { part, total: numParts });
          progressBar.render();
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
    handleError(error, 'Split failed: ');
  }
}

/**
 * Split video into multiple parts.
 *
 * @param {string} input - Path to input video file.
 * @param {SplitOptions} options - Split options including preset, duration, mode.
 *
 * @returns {Promise<void>}
 *
 * @throws {void} Exits with code 1 on error.
 */
export async function splitAction(input: string, options: SplitOptions): Promise<void> {
  try {
    log.loading('Preparing split operation...');

    await ensureDependencies();

    try {
      await validateFileExists(input);
    } catch (error) {
      handleError(error);
    }

    const partDuration = resolvePartDuration(options);
    const totalDuration = await getVideoDuration(input);
    const numParts = calculateNumParts(totalDuration, partDuration);

    if (numParts <= 1) {
      log.info(`Video is ${Math.round(totalDuration)}s long, no splitting needed (max part: ${partDuration}s).`);
      log.info('Use --duration to set a smaller max part size if needed.');
      return;
    }

    const outputPaths = generateSplitOutputPaths(input, numParts);

    const shouldProceed = await checkAndPromptOverwrite(outputPaths);
    if (!shouldProceed) {
      process.exit(0);
    }

    await executeSplit(input, outputPaths, partDuration, totalDuration, options);
  } catch (error) {
    handleError(error);
  }
}

/**
 * Setup split command with Commander.js.
 *
 * @param {Command} program - Commander program instance to register the command on.
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
