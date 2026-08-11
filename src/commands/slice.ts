import { resolve, dirname } from 'path';

import type { Command } from 'commander';

import type { SliceOptions, SliceSegment } from '@/types/index';
import { ensureDependencies } from '@/utils/dependencies';
import { loading } from '@/utils/icons';
import { log, handleError } from '@/utils/log';
import { resolveOutputFile } from '@/utils/output';
import { createProgressBar } from '@/utils/progress';
import { checkAndPromptOverwrite } from '@/utils/prompt';
import {
  parseTimeToSeconds,
  sliceVideoStreamCopy,
  sliceVideoReencode,
  sliceMultipleSegments,
  formatTimeForFFmpeg,
} from '@/utils/slice';
import { validateFileExists } from '@/utils/validations';

/* Default codec for re-encoding */
const DEFAULT_CODEC: 'h264' | 'hevc' = 'h264';
/* Default CRF for re-encoding */
const DEFAULT_CRF = 23;

/**
 * Format seconds to smart filename string
 * - Removes unnecessary leading zeros
 * - Only includes hours if >= 1 hour
 * - Uses underscores as separators.
 *
 * @param {number} seconds - Duration in seconds.
 *
 * @returns {string} Smart formatted string (e.g., "10s", "1m_30s", "00h_10m_30s").
 */
export function formatSecondsToFilename(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}h_${mins.toString().padStart(2, '0')}m_${secs.toString().padStart(2, '0')}s`;
  }
  if (mins > 0) {
    return `${mins}m_${secs.toString().padStart(2, '0')}s`;
  }
  return `${secs}s`;
}

/**
 * Handle multi-segment slicing (--segments option).
 *
 * @param {string} input - Path to input video file.
 * @param {SliceOptions} options - Slice options.
 *
 * @returns {Promise<void>}
 */
export async function handleSliceSegments(input: string, options: SliceOptions): Promise<void> {
  const dir = dirname(input);
  const mode = options.fast ? 'fast' : 'precise';
  const segments = options.segments!;

  const outputPaths: string[] = [];
  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    outputPaths.push(`${dir}/segment_${i + 1}_${segment.start.replace(/:/g, '')}_${segment.end.replace(/:/g, '')}.mp4`);
  }

  const shouldProceed = await checkAndPromptOverwrite(outputPaths);
  if (!shouldProceed) {
    process.exit(0);
  }

  log.succeed(`Slicing started | ${segments.length} segments | Mode: ${mode}`);

  const progressBar = createProgressBar(`${loading} Slicing | ${segments.length} segments | ${mode}`);

  progressBar.start(100, 0);

  try {
    await sliceMultipleSegments(input, dir, segments, !!options.fast, (progress, segment) => {
      progressBar.update(Math.round(progress), { segment });
      progressBar.render();
    });

    progressBar.stop();
    log.succeed('Slicing completed successfully!');
    for (const outputPath of outputPaths) {
      log.info(`Output: ${resolve(outputPath)}`);
    }
  } catch (error) {
    progressBar.stop();
    handleError(error, 'Slicing failed: ');
  }
}

/**
 * Resolve time range from slice options (start/end/duration).
 *
 * @param {SliceOptions} options - Slice options.
 *
 * @returns {{ startTime: number; endTime: number; startFFmpeg: string; endFFmpeg: string }} Resolved time range.
 */
export function resolveTimeRange(options: SliceOptions): {
  startTime: number;
  endTime: number;
  startFFmpeg: string;
  endFFmpeg: string;
} {
  const startTime = parseTimeToSeconds(options.start!);
  let endTime = options.end ? parseTimeToSeconds(options.end) : undefined;

  if (endTime === undefined && options.duration) {
    const durationSec = parseTimeToSeconds(options.duration);
    const startSec = parseTimeToSeconds(options.start!);
    if (!isNaN(durationSec) && !isNaN(startSec)) {
      endTime = startSec + durationSec;
    }
  }

  const startFFmpeg = formatTimeForFFmpeg(options.start!);
  const endFFmpeg = options.end ? formatTimeForFFmpeg(options.end) : formatTimeForFFmpeg(String(endTime));
  const finalEndTime = endTime!;

  return { startTime, endTime: finalEndTime, startFFmpeg, endFFmpeg };
}

/**
 * Validate single-slice options have the required time parameters.
 *
 * @param {SliceOptions} options - Slice options.
 */
export function validateSliceOptions(options: SliceOptions): void {
  if (!options.start || (!options.end && !options.duration)) {
    log.fail('Please provide --start and --end (or --duration) options');
    process.exit(1);
  }
}

/**
 * Resolve slice mode label.
 *
 * @param {SliceOptions} options - Slice options.
 *
 * @returns {'fast' | 'precise' | 'auto'} Mode string.
 */
export function resolveSliceMode(options: SliceOptions): 'fast' | 'precise' | 'auto' {
  if (options.fast) return 'fast';
  if (options.precise) return 'precise';
  return 'auto';
}

/**
 * Execute a single slice operation (fast, precise, or auto).
 *
 * @param {string} input - Input file path.
 * @param {string} outputFile - Output file path.
 * @param {string} startFFmpeg - Start time for ffmpeg.
 * @param {string} endFFmpeg - End time for ffmpeg.
 * @param {SliceOptions} options - Slice options.
 * @param {object} progressBar - Progress bar instance.
 * @param {(pct: number) => void} progressBar.update - Update method.
 * @param {() => void} progressBar.render - Render method.
 *
 * @returns {Promise<void>}
 */
export async function executeSingleSlice(
  input: string,
  outputFile: string,
  startFFmpeg: string,
  endFFmpeg: string,
  options: SliceOptions,
  progressBar: { update: (pct: number) => void; render: () => void }
): Promise<void> {
  if (options.precise) {
    const codec = options.codec === 'hevc' ? 'hevc' : 'h264';
    await sliceVideoReencode(input, outputFile, startFFmpeg, endFFmpeg, codec, DEFAULT_CRF, (pct) => {
      progressBar.update(pct);
      progressBar.render();
    });
  } else {
    await sliceVideoStreamCopy(input, outputFile, startFFmpeg, endFFmpeg, () => {});
  }
}

/**
 * Handle single segment slicing (--start/--end/--duration).
 *
 * @param {string} input - Path to input video file.
 * @param {SliceOptions} options - Slice options.
 *
 * @returns {Promise<void>}
 */
export async function handleSingleSlice(input: string, options: SliceOptions): Promise<void> {
  validateSliceOptions(options);

  const { startTime, endTime, startFFmpeg, endFFmpeg } = resolveTimeRange(options);
  const mode = resolveSliceMode(options);
  const startDisplay = formatSecondsToFilename(startTime);
  const endDisplay = formatSecondsToFilename(endTime);

  const outputFile = resolveOutputFile({ input, output: options.output, suffix: `_${startDisplay}_${endDisplay}` });

  const shouldProceed = await checkAndPromptOverwrite([outputFile]);
  if (!shouldProceed) {
    process.exit(0);
  }

  log.succeed(`Slicing started | ${startDisplay} to ${endDisplay} | Mode: ${mode}`);

  const progressBar = createProgressBar(`${loading} Slicing | ${startDisplay} to ${endDisplay}`);

  progressBar.start(100, 0);

  try {
    await executeSingleSlice(input, outputFile, startFFmpeg, endFFmpeg, options, progressBar);
  } catch (error) {
    handleError(error, 'Slicing failed: ');
  }

  progressBar.stop();
  log.succeed('Slicing completed successfully!');
  log.info(`Output: ${resolve(outputFile)}`);
}

/**
 * Slice/trim video segment.
 *
 * @param {string} input - Path to input video file.
 * @param {SliceOptions} options - Slice options including start, end, fast, precise.
 *
 * @returns {Promise<void>}
 *
 * @throws {void} Exits with code 1 on error.
 */
export async function sliceAction(input: string, options: SliceOptions): Promise<void> {
  try {
    log.loading('Preparing slice operation...');

    await ensureDependencies();

    try {
      await validateFileExists(input);
    } catch (error) {
      handleError(error);
    }

    if (options.segments && options.segments.length > 0) {
      await handleSliceSegments(input, options);
      return;
    }

    await handleSingleSlice(input, options);
  } catch (error) {
    handleError(error);
  }
}

/**
 * Parse segments string to array.
 *
 * @param {string} segmentsStr - Segments string (e.g., "0-10,30-45").
 *
 * @returns {SliceSegment[]} Array of segments.
 */
export function parseSegments(segmentsStr: string): SliceSegment[] {
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
 * Setup slice command with Commander.js.
 *
 * @param {Command} program - Commander program instance to register the command on.
 */
export function setupSlice(program: Command): void {
  program
    .command('slice <input>')
    .alias('slc')
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
