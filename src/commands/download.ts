import { rename, unlink } from 'fs/promises';
import { resolve, dirname, basename, extname, join } from 'path';

import type { Command } from 'commander';

import { splitAction } from '@/commands/split';
import type { DownloadOptions, SplitOptions, SplitPreset } from '@/types/index';
import { ensureDependencies } from '@/utils/dependencies';
import { convertVideo, getVideoDuration } from '@/utils/ffmpeg';
import { loading } from '@/utils/icons';
import { log, handleError } from '@/utils/log';
import { createProgressBar, createProgressCallback, formatFileSize } from '@/utils/progress';
import { checkAndPromptOverwrite } from '@/utils/prompt';
import type { ParseSplitValueResult } from '@/utils/split';
import { parseSplitValue, getPresetDuration, calculateNumParts } from '@/utils/split';
import { validateUrl, validateFormat } from '@/utils/validations';
import { downloadVideo, getVideoInfo, generateFilename } from '@/utils/ytdlp';
import type { VideoInfo } from '@/utils/ytdlp';

/* Allowed video/audio formats for download */
const ALLOWED_FORMATS = ['mp4', 'mkv', 'webm', 'avi', 'mov', 'mp3'];
/* Default convert preset */
const DEFAULT_CONVERT_PRESET = 'fast';

/**
 * Validate URL and format, fetch video info, and resolve output path.
 *
 * @param {string} url - Video URL to validate and download.
 * @param {DownloadOptions} options - Download options including format and cookies.
 *
 * @returns {Promise<{ format: string; outputFile: string; videoInfo: VideoInfo }>} Resolved download target.
 */
export async function resolveDownloadTarget(
  url: string,
  options: DownloadOptions
): Promise<{ format: string; outputFile: string; videoInfo: VideoInfo }> {
  if (!validateUrl(url)) {
    log.fail('Invalid URL format. Please provide a valid HTTP/HTTPS URL.');
    process.exit(1);
  }

  const format = options.format || 'mp4';
  try {
    validateFormat(format, ALLOWED_FORMATS);
  } catch (error) {
    handleError(error);
  }

  log.loading('Getting video information...');
  const videoInfo = await getVideoInfo(url, options.cookies);
  log.succeed('Video information retrieved');

  let outputFile: string;
  if (options.output) {
    const outputExt = extname(options.output).slice(1);
    outputFile = outputExt === format ? options.output : `${options.output}.${format}`;
  } else {
    outputFile = generateFilename(videoInfo, format);
  }

  return { format, outputFile, videoInfo };
}

/**
 * Handle --convert and --split post-download options.
 *
 * @param {string} outputFile - Path to the downloaded file.
 * @param {string} format - Format used for download.
 * @param {DownloadOptions} options - Download options including convert and split.
 *
 * @returns {Promise<void>}
 */
export async function handlePostDownload(outputFile: string, format: string, options: DownloadOptions): Promise<void> {
  let finalOutput = outputFile;

  if (options.convert) {
    finalOutput = await handleConvert(outputFile, format);
  }

  if (options.split) {
    await handleSplit(finalOutput, options.split);
  } else {
    log.info(`Output: ${resolve(finalOutput)}`);
  }
}

/**
 * Download video from URL using yt-dlp.
 *
 * @param {string} url - Video URL to download.
 * @param {DownloadOptions} options - Download options including output and format.
 *
 * @returns {Promise<void>}
 *
 * @throws {void} Exits with code 1 on error.
 */
export async function downloadAction(url: string, options: DownloadOptions): Promise<void> {
  try {
    await ensureDependencies();

    const { format, outputFile, videoInfo } = await resolveDownloadTarget(url, options);

    const shouldProceed = await checkAndPromptOverwrite([outputFile]);
    if (!shouldProceed) {
      process.exit(0);
    }

    const { value: total, unit } = formatFileSize(videoInfo.filesize || 0);
    const roundedTotal = Math.round(total);
    const progressBar = createProgressBar(`${loading} Downloading`, unit);

    const progressCallback = (percentage: number, _size: number, _unit: string) => {
      const current = Math.round((percentage / 100) * total);
      progressBar.update(current, { total: roundedTotal });
      progressBar.render();
    };

    progressBar.start(roundedTotal, 0);

    try {
      await downloadVideo(url, outputFile, format, progressCallback, options.cookies);
    } catch (error) {
      progressBar.stop();
      handleError(error, 'Download failed: ');
    }

    progressBar.update(roundedTotal, { total: roundedTotal });
    progressBar.render();
    progressBar.stop();

    log.succeed('Download completed successfully!');

    await handlePostDownload(outputFile, format, options);
  } catch (error) {
    handleError(error);
  }
}

/**
 * Handle --convert option: rename to temp, convert, rename to original.
 *
 * @param {string} downloadedFile - Path to the downloaded file.
 * @param {string} format - Target format for conversion.
 *
 * @returns {Promise<string>} Path to the converted file.
 */
export async function handleConvert(downloadedFile: string, format: string): Promise<string> {
  const dir = dirname(downloadedFile);
  const ext = extname(downloadedFile);
  const baseName = basename(downloadedFile, ext);
  const tempFile = join(dir, `temp-${baseName}${ext}`);
  const finalFile = join(dir, `${baseName}.${format}`);

  log.loading('Converting downloaded file...');

  try {
    await rename(downloadedFile, tempFile);

    const progressBar = createProgressBar(`${loading} Converting | ${format.toUpperCase()}`);
    const progressCallback = createProgressCallback(progressBar);

    progressBar.start(100, 0);

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
    handleError(error, 'Conversion failed: ');
  }
}

/**
 * Handle --split option: parse value and call splitAction.
 *
 * @param {string} inputFile - Path to the file to split.
 * @param {string} splitValue - Split value (preset or seconds).
 *
 * @returns {Promise<void>}
 */
export async function handleSplit(inputFile: string, splitValue: string): Promise<void> {
  let parsed: ParseSplitValueResult;

  try {
    parsed = parseSplitValue(splitValue);
  } catch (error) {
    handleError(error);
  }

  const partDuration: number =
    parsed!.type === 'preset' ? getPresetDuration(parsed!.value as SplitPreset) : Number(parsed!.value);

  const totalDuration = await getVideoDuration(inputFile);
  const numParts = calculateNumParts(totalDuration, partDuration);

  if (numParts <= 1) {
    log.info(`Video is ${Math.round(totalDuration)}s long, no splitting needed (max part: ${partDuration}s).`);
    log.info('Use --duration to set a smaller max part size if needed.');
    log.info(`Output: ${resolve(inputFile)}`);
    return;
  }

  const splitOptions: SplitOptions = { fast: true };

  if (parsed!.type === 'preset') {
    splitOptions.preset = parsed!.value as SplitOptions['preset'];
  } else {
    splitOptions.duration = String(parsed!.value);
  }

  await splitAction(inputFile, splitOptions);
}

/**
 * Setup download command with Commander.js.
 *
 * @param {Command} program - Commander program instance to register the command on.
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
    .option('--cookies <browser>', 'Load cookies from browser (chrome, firefox, edge, brave, etc.)')
    .action(downloadAction);
}
