import { resolve } from 'path';

import type { Command } from 'commander';
import ora from 'ora';

import type { DownloadOptions } from '../types/index.js';
import { checkDependencies } from '../utils/dependencies.js';
import { createProgressBar } from '../utils/progress.js';
import { validateUrl, validateFormat } from '../utils/validations.js';
import { downloadVideo, getVideoInfo, generateFilename } from '../utils/ytdlp.js';

const BYTES_TO_MB = 1024 * 1024;

const ALLOWED_FORMATS = ['mp4', 'mkv', 'webm', 'avi', 'mov', 'mp3'];

/**
 * Download action - downloads video from URL using yt-dlp
 *
 * @param {string} url - Video URL to download (must be valid HTTP/HTTPS URL)
 * @param {DownloadOptions} options - Download configuration options including output filename and format
 * @returns {Promise<void>} Promise that resolves when download is complete
 * @throws {void} Exits process with code 1 if dependencies missing, URL invalid, or download fails
 */
export async function downloadAction(url: string, options: DownloadOptions): Promise<void> {
  try {
    // Check dependencies
    const deps = await checkDependencies();
    if (!deps.ok) {
      console.error(`Error: Missing required dependencies: ${deps.missing.join(', ')}`);
      console.error('Please install them using:');
      console.error('  brew install ffmpeg yt-dlp');
      process.exit(1);
    }

    // Validate URL
    if (!validateUrl(url)) {
      console.error('Error: Invalid URL format. Please provide a valid HTTP/HTTPS URL.');
      process.exit(1);
    }

    // Validate format
    const format = options.format || 'mp4';
    validateFormat(format, ALLOWED_FORMATS);

    // Show spinner while getting video info
    const spinner = ora('Getting video information...').start();

    // Get video info to determine filename
    const videoInfo = await getVideoInfo(url);
    spinner.succeed('Video information retrieved');

    // Determine output filename
    let outputFile: string;
    if (options.output) {
      outputFile = options.output.includes('.')
        ? options.output
        : `${options.output}.${format === 'mp3' ? 'mp3' : videoInfo.ext}`;
    } else {
      outputFile = generateFilename(videoInfo, format);
    }

    const totalMB = videoInfo.filesize ? Math.round(videoInfo.filesize / BYTES_TO_MB) : 100;
    const progressBar = createProgressBar('Downloading');

    const progressCallback = (percentage: number, _size: number, _unit: string) => {
      const currentMB = Math.round((percentage / 100) * totalMB);
      progressBar.update(currentMB, { total: totalMB });
    };

    // Create progress bar
    progressBar.start(totalMB, 0);

    // Download video
    await downloadVideo(url, outputFile, format, progressCallback);

    // Ensure progress bar shows completion
    progressBar.update(totalMB, { total: totalMB });
    progressBar.stop();

    console.log('\n✓ Download completed successfully!');
    console.log(`  Output file: ${resolve(outputFile)}`);
  } catch (error) {
    console.error('\n✗ Error:', error instanceof Error ? error.message : String(error));
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
