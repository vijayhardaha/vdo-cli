import { resolve } from 'path';

import type { Command } from 'commander';

import { loading } from '@/utils/icons.js';

import type { DownloadOptions } from '../types/index.js';
import { checkDependencies } from '../utils/dependencies.js';
import { log } from '../utils/log.js';
import { createProgressBar, formatFileSize } from '../utils/progress.js';
import { validateUrl, validateFormat } from '../utils/validations.js';
import { downloadVideo, getVideoInfo, generateFilename } from '../utils/ytdlp.js';

const ALLOWED_FORMATS = ['mp4', 'mkv', 'webm', 'avi', 'mov', 'mp3'];

export async function downloadAction(url: string, options: DownloadOptions): Promise<void> {
  try {
    const deps = await checkDependencies();
    if (!deps.ok) {
      log.fail(`Missing required dependencies: ${deps.missing.join(', ')}`);
      log.warn('Please install them using:');
      log.warn('  brew install ffmpeg yt-dlp');
      process.exit(1);
    }

    if (!validateUrl(url)) {
      log.fail('Invalid URL format. Please provide a valid HTTP/HTTPS URL.');
      process.exit(1);
    }

    const format = options.format || 'mp4';
    try {
      validateFormat(format, ALLOWED_FORMATS);
    } catch (error) {
      log.fail(error instanceof Error ? error.message : String(error));
      process.exit(1);
    }

    log.loading('Getting video information...');

    const videoInfo = await getVideoInfo(url);
    log.succeed('Video information retrieved');

    let outputFile: string;
    if (options.output) {
      outputFile = options.output.includes('.')
        ? options.output
        : `${options.output}.${format === 'mp3' ? 'mp3' : videoInfo.ext}`;
    } else {
      outputFile = generateFilename(videoInfo, format);
    }

    const { value: total, unit } = formatFileSize(videoInfo.filesize || 0);
    const roundedTotal = Math.round(total);
    const progressBar = createProgressBar(`${loading} Downloading`, unit);

    const progressCallback = (percentage: number, _size: number, _unit: string) => {
      const current = Math.round((percentage / 100) * total);
      progressBar.update(current, { total: roundedTotal });
    };

    progressBar.start(roundedTotal, 0);

    try {
      await downloadVideo(url, outputFile, format, progressCallback);
    } catch (error) {
      progressBar.stop();
      log.fail(`Download failed: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }

    progressBar.update(roundedTotal, { total: roundedTotal });
    progressBar.stop();

    log.succeed('Download completed successfully!');
    log.info(`Output: ${resolve(outputFile)}`);
  } catch (error) {
    log.fail(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

/**
 * Setup download command with Commander.js
 *
 * @param {Command} program - Commander program instance to register the command on
 * @returns {void}
 */
export function setupDownload(program: Command): void {
  program
    .command('download <url>')
    .alias('dl')
    .description('Download video from URL')
    .option('-o, --output <file>', 'Output file name')
    .option('--format <format>', 'Select format (mp4, mkv, webm, avi, mov, mp3)', 'mp4')
    .action(downloadAction);
}
