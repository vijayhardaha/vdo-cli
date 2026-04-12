import { resolve, dirname } from 'path';

import type { Command } from 'commander';

import type { SliceOptions, SliceSegment } from '@/types/index';
import { ensureDependencies } from '@/utils/dependencies';
import { loading } from '@/utils/icons';
import { log } from '@/utils/log';
import { resolveOutputFile } from '@/utils/output';
import { createProgressBar } from '@/utils/progress';
import { checkAndPromptOverwrite } from '@/utils/prompt';
import { sliceVideoStreamCopy, sliceVideoReencode, sliceMultipleSegments, formatTimeForFFmpeg } from '@/utils/slice';
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
function formatSecondsToFilename(seconds: number): string {
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
 * Parse time string to seconds.
 *
 * @param {string} timeStr - Time string (e.g., '10', '1:30', '00:01:30').
 *
 * @returns {number} Duration in seconds.
 */
function parseTimeToSeconds(timeStr: string): number {
  const hmsMatch = timeStr.match(/^(\d+):(\d{2}):(\d{2})(?:\.(\d+))?$/);
  if (hmsMatch) {
    const hours = parseInt(hmsMatch[1], 10);
    const mins = parseInt(hmsMatch[2], 10);
    const secs = parseInt(hmsMatch[3], 10);
    return hours * 3600 + mins * 60 + secs;
  }

  const msMatch = timeStr.match(/^(\d+):(\d{2})(?:\.(\d+))?$/);
  if (msMatch) {
    const mins = parseInt(msMatch[1], 10);
    const secs = parseInt(msMatch[2], 10);
    return mins * 60 + secs;
  }

  return parseFloat(timeStr);
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
      log.fail(error instanceof Error ? error.message : String(error));
      process.exit(1);
    }

    // check: if segments array is provided
    if (options.segments && options.segments.length > 0) {
      const dir = dirname(input);
      const mode = options.fast ? 'fast' : 'precise';

      const outputPaths: string[] = [];
      for (let i = 0; i < options.segments.length; i++) {
        const segment = options.segments[i];
        outputPaths.push(
          `${dir}/segment_${i + 1}_${segment.start.replace(/:/g, '')}_${segment.end.replace(/:/g, '')}.mp4`
        );
      }

      const shouldProceed = await checkAndPromptOverwrite(outputPaths);
      if (!shouldProceed) {
        process.exit(0);
      }

      log.succeed(`Slicing started | ${options.segments.length} segments | Mode: ${mode}`);

      const progressBar = createProgressBar(`${loading} Slicing | ${options.segments.length} segments | ${mode}`);

      progressBar.start(100, 0);

      try {
        await sliceMultipleSegments(input, dir, options.segments, !!options.fast, (progress, segment) => {
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

    const startTime = parseTimeToSeconds(options.start);
    let endTime = options.end ? parseTimeToSeconds(options.end) : undefined;
    const mode = options.fast ? 'fast' : options.precise ? 'precise' : 'auto';

    // check: if duration is provided instead of end
    if (endTime === undefined && options.duration) {
      const durationSec = parseTimeToSeconds(options.duration);
      const startSec = parseTimeToSeconds(options.start);
      if (!isNaN(durationSec) && !isNaN(startSec)) {
        endTime = startSec + durationSec;
      }
    }

    // Format for ffmpeg and display
    const startFFmpeg = formatTimeForFFmpeg(options.start);
    const endFFmpeg = options.end ? formatTimeForFFmpeg(options.end) : formatTimeForFFmpeg(String(endTime));
    const startDisplay = formatSecondsToFilename(startTime);
    const endDisplay = endTime !== undefined ? formatSecondsToFilename(endTime) : '';

    const outputFile = resolveOutputFile({ input, output: options.output, suffix: `_${startDisplay}_${endDisplay}` });

    const shouldProceed = await checkAndPromptOverwrite([outputFile]);
    if (!shouldProceed) {
      process.exit(0);
    }

    log.succeed(`Slicing started | ${startDisplay} to ${endDisplay} | Mode: ${mode}`);

    const progressBar = createProgressBar(`${loading} Slicing | ${startDisplay} to ${endDisplay}`);

    progressBar.start(100, 0);

    try {
      if (options.fast) {
        await sliceVideoStreamCopy(input, outputFile, startFFmpeg, endFFmpeg, (_progress) => {
          // Stream copy is fast, progress callback optional
        });
      } else if (options.precise) {
        const codec = options.codec === 'hevc' ? 'hevc' : 'h264';
        await sliceVideoReencode(input, outputFile, startFFmpeg, endFFmpeg, codec, DEFAULT_CRF, (progress) => {
          progressBar.update(progress);
          progressBar.render();
        });
      } else {
        // Smart default: use stream copy (faster)
        await sliceVideoStreamCopy(input, outputFile, startFFmpeg, endFFmpeg, (_progress) => {
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
 * Parse segments string to array.
 *
 * @param {string} segmentsStr - Segments string (e.g., "0-10,30-45").
 *
 * @returns {SliceSegment[]} Array of segments.
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
 * Setup slice command with Commander.js.
 *
 * @param {Command} program - Commander program instance to register the command on.
 *
 * @returns {void}
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
