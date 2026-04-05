import { resolve, dirname, basename, extname, join } from 'path';

import type { Command } from 'commander';

import { loading } from '@/utils/icons';

import type { SliceOptions, SliceSegment } from '../types/index';
import { checkDependencies } from '../utils/dependencies';
import { log } from '../utils/log';
import { createProgressBar } from '../utils/progress';
import { sliceVideoStreamCopy, sliceVideoReencode, sliceMultipleSegments, formatTimeForFFmpeg } from '../utils/slice';
import { validateFileExists } from '../utils/validations';

/* Default codec for re-encoding */
const DEFAULT_CODEC: 'h264' | 'hevc' = 'h264';
/* Default CRF for re-encoding */
const DEFAULT_CRF = 23;

/**
 * Slice/trim video segment
 *
 * @param {string} input - Path to input video file
 * @param {SliceOptions} options - Slice options including start, end, fast, precise
 * @returns {Promise<void>}
 * @throws {void} Exits with code 1 on error
 */
export async function sliceAction(input: string, options: SliceOptions): Promise<void> {
  try {
    log.loading('Preparing slice operation...');

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

    // check: if segments array is provided
    if (options.segments && options.segments.length > 0) {
      const dir = dirname(input);
      const mode = options.fast ? 'fast' : 'precise';

      log.succeed(`Slicing started | ${options.segments.length} segments | Mode: ${mode}`);

      const progressBar = createProgressBar(`${loading} Slicing | ${options.segments.length} segments | ${mode}`);

      try {
        const outputPaths = await sliceMultipleSegments(
          input,
          dir,
          options.segments,
          !!options.fast,
          (progress, segment) => {
            progressBar.update(Math.round(progress), { segment });
          }
        );

        progressBar.stop();
        log.succeed('Slicing completed successfully!');
        for (const outputPath of outputPaths) {
          log.info(`Output: ${resolve(outputPath)}`);
        }
      } catch (error) {
        progressBar.stop();
        log.fail(`Slicing failed: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
      return;
    }

    // check: if single segment start/end is provided
    if (!options.start || (!options.end && !options.duration)) {
      log.fail('Please provide --start and --end (or --duration) options');
      process.exit(1);
    }

    const start = formatTimeForFFmpeg(options.start);
    let end = options.end ? formatTimeForFFmpeg(options.end) : undefined;
    const mode = options.fast ? 'fast' : options.precise ? 'precise' : 'auto';

    // check: if duration is provided instead of end
    if (!end && options.duration) {
      const durationSec = parseFloat(options.duration);
      const startSec = parseFloat(options.start);
      if (!isNaN(durationSec) && !isNaN(startSec)) {
        const endSec = startSec + durationSec;
        const hours = Math.floor(endSec / 3600);
        const mins = Math.floor((endSec % 3600) / 60);
        const secs = Math.floor(endSec % 60);
        end = `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
      }
    }

    let outputFile = options.output;
    // check: if output path not provided, generate descriptive default
    if (!outputFile) {
      const dir = dirname(input);
      const ext = extname(input);
      const safeStart = start.replace(/:/g, 'h') + 'm';
      const safeEnd = end ? end.replace(/:/g, 'h') + 'm' : '';
      outputFile = join(dir, `${basename(input, ext)}_${safeStart}_${safeEnd}${ext}`);
    }

    log.succeed(`Slicing started | ${start} to ${end} | Mode: ${mode}`);

    const progressBar = createProgressBar(`${loading} Slicing | ${start} to ${end}`);

    try {
      if (options.fast) {
        await sliceVideoStreamCopy(input, outputFile, start, end!, (_progress) => {
          // Stream copy is fast, progress callback optional
        });
      } else if (options.precise) {
        const codec = options.codec === 'hevc' ? 'hevc' : 'h264';
        await sliceVideoReencode(input, outputFile, start, end!, codec, DEFAULT_CRF, (progress) => {
          progressBar.update(progress);
        });
      } else {
        // Smart default: use stream copy (faster)
        await sliceVideoStreamCopy(input, outputFile, start, end!, (_progress) => {
          // Stream copy is fast
        });
      }
    } catch (error) {
      log.fail(`Slicing failed: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }

    progressBar.stop();
    log.succeed('Slicing completed successfully!');
    log.info(`Output: ${resolve(outputFile)}`);
  } catch (error) {
    log.fail(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

/**
 * Parse segments string to array
 *
 * @param {string} segmentsStr - Segments string (e.g., "0-10,30-45")
 * @returns {SliceSegment[]} Array of segments
 */
function parseSegments(segmentsStr: string): SliceSegment[] {
  const segments: SliceSegment[] = [];
  const parts = segmentsStr.split(',');

  for (const part of parts) {
    const [start, end] = part.trim().split('-');
    if (start && end) {
      segments.push({ start: start.trim(), end: end.trim() });
    }
  }

  return segments;
}

/**
 * Setup slice command with Commander.js
 *
 * @param {Command} program - Commander program instance to register the command on
 * @returns {void}
 */
export function setupSlice(program: Command): void {
  program
    .command('slice <input>')
    .alias('sl')
    .description('Slice/trim video segment')
    .option('-o, --output <file>', 'Output file name')
    .option('-s, --start <time>', 'Start time (e.g., 0, 10, 1:30, 00:01:30)')
    .option('-e, --end <time>', 'End time (e.g., 10, 1:40, 00:01:40)')
    .option('-d, --duration <time>', 'Duration instead of end time')
    .option('--segments <string>', 'Multiple segments (e.g., "0-10,30-45,60-90")')
    .option('--fast', 'Use stream copy (fast, may not be frame-accurate)')
    .option('--precise', 'Re-encode for frame accuracy (slower)')
    .option('--codec <codec>', 'Codec for re-encoding (h264, hevc)', DEFAULT_CODEC)
    .action((input: string, options: SliceOptions & { segments?: string }) => {
      // check: if segments string is provided
      if (options.segments && typeof options.segments === 'string') {
        const parsedSegments = parseSegments(options.segments);
        sliceAction(input, { ...options, segments: parsedSegments });
      } else {
        sliceAction(input, options);
      }
    });
}
