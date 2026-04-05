import { resolve, dirname, basename, extname, join } from 'path';

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
import { log } from '@/utils/log';
import { createProgressBar } from '@/utils/progress';
import { validateFileExists } from '@/utils/validations';

/* Discord file size limit in MB (with buffer) */
const DISCORD_SIZE_MB = 24.5;

/* Default audio bitrate */
const DEFAULT_AUDIO_BITRATE = '128k';

/**
 * Compact video to target size using two-pass encoding
 *
 * @param {string} input - Path to input video file
 * @param {CompactOptions} options - Compact options including target size, quality, preset
 * @returns {Promise<void>}
 * @throws {void} Exits with code 1 on error
 */
export async function compactAction(input: string, options: CompactOptions): Promise<void> {
  try {
    log.loading('Preparing compact operation...');

    await ensureDependencies();

    try {
      await validateFileExists(input);
    } catch (error) {
      log.fail(error instanceof Error ? error.message : String(error));
      process.exit(1);
    }

    const audioBitrate = options.audioBitrate || DEFAULT_AUDIO_BITRATE;
    const preset = options.preset || 'medium';
    const hevc = options.hevc || false;

    let outputFile = options.output;
    // check: if output path not provided, generate default
    if (!outputFile) {
      const dir = dirname(input);
      const name = basename(input, extname(input));
      const suffix = hevc ? '_compact_hevc' : '_compact';
      outputFile = join(dir, `${name}${suffix}.mp4`);
    }

    // check: if discord preset is requested
    if (options.discord) {
      const duration = await getVideoDuration(input);
      const targetBitrate = calculateTargetBitrate(DISCORD_SIZE_MB, duration, audioBitrate);
      const codecStr = hevc ? 'HEVC' : 'H.264';

      log.succeed(`Compact started | Target: Discord (${DISCORD_SIZE_MB}MB) | Codec: ${codecStr}`);

      const progressBar = createProgressBar(`${loading} Compacting | Discord ${DISCORD_SIZE_MB}MB | ${preset}`);

      const progressCallback = (percentage: number) => {
        if (progressBar && percentage > 0) {
          progressBar.update(percentage);
        }
      };

      progressBar.start(100, 0);

      try {
        await compactVideo(input, outputFile, targetBitrate, audioBitrate, preset, hevc, progressCallback);
      } catch (error) {
        progressBar.stop();
        log.fail(`Compact failed: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }

      progressBar.stop();
      log.succeed('Compact completed successfully!');
      log.info(`Output: ${resolve(outputFile)}`);
      return;
    }

    // check: if target size is provided (two-pass encoding)
    if (options.target) {
      const targetMB = parseSizeToMB(options.target);
      const duration = await getVideoDuration(input);
      const targetBitrate = calculateTargetBitrate(targetMB, duration, audioBitrate);
      const codecStr = hevc ? 'HEVC' : 'H.264';

      log.succeed(`Compact started | Target: ${targetMB}MB | Bitrate: ${targetBitrate}k | Codec: ${codecStr}`);

      const progressBar = createProgressBar(`${loading} Compacting | ${targetMB}MB | ${preset}`);

      const progressCallback = (percentage: number) => {
        if (progressBar && percentage > 0) {
          progressBar.update(percentage);
        }
      };

      progressBar.start(100, 0);

      try {
        await compactVideo(input, outputFile, targetBitrate, audioBitrate, preset, hevc, progressCallback);
      } catch (error) {
        progressBar.stop();
        log.fail(`Compact failed: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }

      progressBar.stop();
      log.succeed('Compact completed successfully!');
      log.info(`Output: ${resolve(outputFile)}`);
      return;
    }

    // check: if quality preset is provided (single-pass CRF)
    if (options.quality) {
      const crf = getCRFForQuality(options.quality);
      const codecStr = hevc ? 'HEVC' : 'H.264';

      log.succeed(`Compact started | Quality: ${options.quality} (CRF: ${crf}) | Codec: ${codecStr}`);

      const progressBar = createProgressBar(`${loading} Compacting | Quality: ${options.quality} | ${preset}`);

      const progressCallback = (percentage: number) => {
        if (progressBar && percentage > 0) {
          progressBar.update(percentage);
        }
      };

      progressBar.start(100, 0);

      try {
        await compactVideoCRF(input, outputFile, crf, preset, audioBitrate, hevc, progressCallback);
      } catch (error) {
        progressBar.stop();
        log.fail(`Compact failed: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }

      progressBar.stop();
      log.succeed('Compact completed successfully!');
      log.info(`Output: ${resolve(outputFile)}`);
      return;
    }

    // check: if percent reduction is requested
    if (options.percent && options.percent > 0 && options.percent < 100) {
      const duration = await getVideoDuration(input);
      const targetMB = Math.round(duration * 0.5 * options.percent) / 100;
      const targetBitrate = calculateTargetBitrate(targetMB, duration, audioBitrate);
      const codecStr = hevc ? 'HEVC' : 'H.264';

      log.succeed(
        `Compact started | Reduce: ${options.percent}% | Target: ~${Math.round(targetMB)}MB | Codec: ${codecStr}`
      );

      const progressBar = createProgressBar(`${loading} Compacting | ${options.percent}% reduction | ${preset}`);

      const progressCallback = (percentage: number) => {
        if (progressBar && percentage > 0) {
          progressBar.update(percentage);
        }
      };

      progressBar.start(100, 0);

      try {
        await compactVideo(input, outputFile, targetBitrate, audioBitrate, preset, hevc, progressCallback);
      } catch (error) {
        progressBar.stop();
        log.fail(`Compact failed: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }

      progressBar.stop();
      log.succeed('Compact completed successfully!');
      log.info(`Output: ${resolve(outputFile)}`);
      return;
    }

    // default: use medium quality if no options provided
    const crf = getCRFForQuality('medium');
    log.succeed(`Compact started | Quality: medium (CRF: ${crf})`);

    const progressBar = createProgressBar(`${loading} Compacting | Quality: medium | ${preset}`);

    const progressCallback = (percentage: number) => {
      if (progressBar && percentage > 0) {
        progressBar.update(percentage);
      }
    };

    progressBar.start(100, 0);

    try {
      await compactVideoCRF(input, outputFile, crf, preset, audioBitrate, hevc, progressCallback);
    } catch (error) {
      progressBar.stop();
      log.fail(`Compact failed: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }

    progressBar.stop();
    log.succeed('Compact completed successfully!');
    log.info(`Output: ${resolve(outputFile)}`);
  } catch (error) {
    log.fail(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

/**
 * Setup compact command with Commander.js
 *
 * @param {Command} program - Commander program instance to register the command on
 * @returns {void}
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
