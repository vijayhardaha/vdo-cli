import { rename, unlink } from 'fs/promises';
import { resolve, dirname, basename, extname, join } from 'path';

import type { Command } from 'commander';

import { loading } from '@/utils/icons';

import { splitAction } from './split';
import type { DownloadOptions, SplitOptions } from '../types/index';
import { checkDependencies } from '../utils/dependencies';
import { convertVideo } from '../utils/ffmpeg';
import { log } from '../utils/log';
import { createProgressBar, formatFileSize } from '../utils/progress';
import { parseSplitValue } from '../utils/split';
import { validateUrl, validateFormat } from '../utils/validations';
import { downloadVideo, getVideoInfo, generateFilename } from '../utils/ytdlp';

/* Allowed video/audio formats for download */
const ALLOWED_FORMATS = ['mp4', 'mkv', 'webm', 'avi', 'mov', 'mp3'];
/* Default convert preset */
const DEFAULT_CONVERT_PRESET = 'fast';

/**
 * Download video from URL using yt-dlp
 *
 * @param {string} url - Video URL to download
 * @param {DownloadOptions} options - Download options including output and format
 * @returns {Promise<void>}
 * @throws {void} Exits with code 1 on error
 */
export async function downloadAction(url: string, options: DownloadOptions): Promise<void> {
  try {
    const deps = await checkDependencies();
    // check: if dependencies are missing
    if (!deps.ok) {
      log.fail(`Missing required dependencies: ${deps.missing.join(', ')}`);
      log.warn('Please install them using:');
      log.warn('  brew install ffmpeg yt-dlp');
      process.exit(1);
    }

    // check: if URL is valid
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
    // check: if output path is provided
    if (options.output) {
      outputFile = options.output.includes('.')
        ? options.output
        : `${options.output}.${format === 'mp3' ? 'mp3' : format}`;
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

    let finalOutput = outputFile;

    // check: if --convert option is provided
    if (options.convert) {
      finalOutput = await handleConvert(outputFile, format);
    }

    // check: if --split option is provided
    if (options.split) {
      await handleSplit(finalOutput, options.split);
    } else {
      log.info(`Output: ${resolve(finalOutput)}`);
    }
  } catch (error) {
    log.fail(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

/**
 * Handle --convert option: rename to temp, convert, rename to original
 *
 * @param {string} downloadedFile - Path to the downloaded file
 * @param {string} format - Target format for conversion
 * @returns {Promise<string>} Path to the converted file
 */
async function handleConvert(downloadedFile: string, format: string): Promise<string> {
  const dir = dirname(downloadedFile);
  const ext = extname(downloadedFile);
  const baseName = basename(downloadedFile, ext);
  const tempFile = join(dir, `temp-${baseName}${ext}`);
  const finalFile = join(dir, `${baseName}.${format}`);

  log.loading('Converting downloaded file...');

  try {
    await rename(downloadedFile, tempFile);

    const progressBar = createProgressBar(`${loading} Converting | ${format.toUpperCase()}`);
    progressBar.start(100, 0);

    const progressCallback = (percentage: number) => {
      if (percentage > 0) {
        progressBar.update(percentage);
      }
    };

    try {
      await convertVideo(tempFile, finalFile, format, DEFAULT_CONVERT_PRESET, progressCallback);
    } catch (error) {
      progressBar.stop();
      await rename(tempFile, downloadedFile);
      throw error;
    }

    progressBar.stop();
    log.succeed('Conversion completed successfully!');

    await unlink(tempFile);

    return finalFile;
  } catch (error) {
    log.fail(`Conversion failed: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}

/**
 * Handle --split option: parse value and call splitAction
 *
 * @param {string} inputFile - Path to the file to split
 * @param {string} splitValue - Split value (preset or seconds)
 * @returns {Promise<void>}
 */
async function handleSplit(inputFile: string, splitValue: string): Promise<void> {
  let splitOptions: SplitOptions;

  try {
    const parsed = parseSplitValue(splitValue);

    splitOptions = { fast: true };

    if (parsed.type === 'preset') {
      splitOptions.preset = parsed.value as SplitOptions['preset'];
    } else {
      splitOptions.duration = String(parsed.value);
    }
  } catch (error) {
    log.fail(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }

  await splitAction(inputFile, splitOptions);
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
    .option('--convert', 'Convert the downloaded file using ffmpeg after download')
    .option('--split <value>', 'Split after download (ig|wa|fb|instagram|whatsapp|facebook or seconds)')
    .action(downloadAction);
}
