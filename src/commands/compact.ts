import { resolve } from 'path';

import type { Command } from 'commander';

import type { CompactOptions } from '@/types/index';
import {
  compactVideo,
  compactVideoCRF,
  parseSizeToMB,
  calculateTargetBitrate,
  getCRFForQuality,
} from '@/utils/compact';
import { ensureDependencies } from '@/utils/dependencies';
import { getVideoDuration } from '@/utils/ffmpeg';
import { loading } from '@/utils/icons';
import { log, handleError } from '@/utils/log';
import { resolveOutputFile } from '@/utils/output';
import { createProgressBar, createProgressCallback } from '@/utils/progress';
import { validateFileExists } from '@/utils/validations';

/* Discord file size limit in MB (with buffer) */
const DISCORD_SIZE_MB = 24.5;

/* Default audio bitrate */
const DEFAULT_AUDIO_BITRATE = '128k';

/* Compact mode identifier */
type CompactMode =
  { type: 'two-pass'; targetBitrate: number; label: string } | { type: 'crf'; crf: number; label: string };

/**
 * Run a compact operation with progress bar and error handling.
 *
 * @param {string} outputFile - Path to output file.
 * @param {string} label - Label for the progress bar.
 * @param {(onProgress: (percentage: number) => void) => Promise<void>} fn - The compact function to run.
 *
 * @returns {Promise<void>}
 */
async function runCompact(
  outputFile: string,
  label: string,
  fn: (onProgress: (percentage: number) => void) => Promise<void>
): Promise<void> {
  const progressBar = createProgressBar(`${loading} ${label}`);
  const progressCallback = createProgressCallback(progressBar);

  progressBar.start(100, 0);

  try {
    await fn(progressCallback);
  } catch (error) {
    progressBar.stop();
    handleError(error, 'Compact failed: ');
  }

  progressBar.stop();
  log.succeed('Compact completed successfully!');
  log.info(`Output: ${resolve(outputFile)}`);
}

/**
 * Resolve compact mode and label from options.
 *
 * @param {string} input - Input file path.
 * @param {CompactOptions} options - Compact options.
 * @param {object} config - Shared config.
 * @param {string} config.audioBitrate - Audio bitrate.
 * @param {string} config.preset - Encoding preset.
 *
 * @returns {Promise<CompactMode>} Resolved compact mode.
 */
async function resolveCompactMode(
  input: string,
  options: CompactOptions,
  config: { audioBitrate: string; preset: string }
): Promise<CompactMode> {
  const { audioBitrate, preset } = config;

  if (options.discord) {
    const duration = await getVideoDuration(input);
    const targetBitrate = calculateTargetBitrate(DISCORD_SIZE_MB, duration, audioBitrate);
    return { type: 'two-pass', targetBitrate, label: `Compacting | Discord ${DISCORD_SIZE_MB}MB | ${preset}` };
  }

  if (options.target) {
    const targetMB = parseSizeToMB(options.target);
    const duration = await getVideoDuration(input);
    const targetBitrate = calculateTargetBitrate(targetMB, duration, audioBitrate);
    return { type: 'two-pass', targetBitrate, label: `Compacting | ${targetMB}MB | ${preset}` };
  }

  if (options.quality) {
    const crf = getCRFForQuality(options.quality);
    return { type: 'crf', crf, label: `Compacting | Quality: ${options.quality} | ${preset}` };
  }

  if (options.percent && options.percent > 0 && options.percent < 100) {
    const duration = await getVideoDuration(input);
    const targetMB = Math.round(duration * 0.5 * options.percent) / 100;
    const targetBitrate = calculateTargetBitrate(targetMB, duration, audioBitrate);
    return { type: 'two-pass', targetBitrate, label: `Compacting | ${options.percent}% reduction | ${preset}` };
  }

  return { type: 'crf', crf: getCRFForQuality('medium'), label: `Compacting | Quality: medium | ${preset}` };
}

/**
 * Compact video to target size using two-pass encoding.
 *
 * @param {string} input - Path to input video file.
 * @param {CompactOptions} options - Compact options including target size, quality, preset.
 *
 * @returns {Promise<void>}
 *
 * @throws {void} Exits with code 1 on error.
 */
async function compactAction(input: string, options: CompactOptions): Promise<void> {
  try {
    log.loading('Preparing compact operation...');

    await ensureDependencies();

    try {
      await validateFileExists(input);
    } catch (error) {
      handleError(error);
    }

    const audioBitrate = options.audioBitrate || DEFAULT_AUDIO_BITRATE;
    const preset = options.preset || 'medium';
    const hevc = options.hevc || false;

    const suffix = hevc ? '_compact_hevc' : '_compact';
    const outputFile = resolveOutputFile({ input, output: options.output, suffix });

    const mode = await resolveCompactMode(input, options, { audioBitrate, preset });

    log.succeed(`Compact started | ${mode.label}`);

    await runCompact(outputFile, mode.label, (onProgress) => {
      if (mode.type === 'two-pass') {
        return compactVideo(input, outputFile, mode.targetBitrate, audioBitrate, preset, hevc, onProgress);
      }
      return compactVideoCRF(input, outputFile, mode.crf, preset, audioBitrate, hevc, onProgress);
    });
  } catch (error) {
    handleError(error);
  }
}

/**
 * Setup compact command with Commander.js.
 *
 * @param {Command} program - Commander program instance to register the command on.
 */
export function setupCompact(program: Command): void {
  program
    .command('compact <input>')
    .alias('cpt')
    .description('Compact video to target size using two-pass encoding')
    .option('-o, --output <file>', 'Output file name')
    .option('--target <size>', 'Target size (e.g., 25MB, 100MB)')
    .option('--percent <value>', 'Reduce to percentage of original size (0-100)')
    .option('--quality <level>', 'Quality preset (low, medium, high, lossless)')
    .option('--preset <preset>', 'Encoding preset (ultrafast, fast, medium, slow)', 'medium')
    .option('--audio-bitrate <bitrate>', 'Audio bitrate (e.g., 128k)', DEFAULT_AUDIO_BITRATE)
    .option('--hevc', 'Use HEVC codec for better compression')
    .option('--discord', 'Optimize for Discord (24.5MB limit)')
    .action(compactAction);
}
