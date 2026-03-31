import type { Command } from 'commander';
import ora from 'ora';
import { resolve } from 'path';
import { checkDependencies } from '../utils/dependencies.js';
import { validateUrl, validateFormat } from '../utils/validations.js';
import { downloadVideo } from '../utils/ytdlp.js';
import { createProgressBar, convertToMB } from '../utils/progress.js';
import type { DownloadOptions } from '../types/index.js';

const ALLOWED_FORMATS = ['mp4', 'mkv', 'mp3'];

/**
 * Download action - downloads video from URL using yt-dlp
 *
 * @param url - Video URL to download (must be valid HTTP/HTTPS URL)
 * @param options - Download configuration options including output filename and format
 * @returns Promise that resolves when download is complete
 * @throws Exits process with code 1 if dependencies missing, URL invalid, or download fails
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

    // Determine output filename
    let outputFile = options.output;
    if (!outputFile) {
      const ext = format === 'mp3' ? 'mp3' : format;
      outputFile = `download.${ext}`;
    } else if (!outputFile.includes('.')) {
      outputFile = `${outputFile}.${format}`;
    }

    // Show spinner while getting video info
    const spinner = ora('Getting video information...').start();

    const progressBar = createProgressBar('Downloading');

    const progressCallback = (percentage: number, size: number, unit: string) => {
      if (progressBar) {
        const totalMB = convertToMB(size, unit);
        const currentMB = Math.round((percentage / 100) * totalMB);
        progressBar.update(currentMB, { total: Math.round(totalMB) });
      }
    };

    spinner.succeed('Video information retrieved');

    // Create progress bar
    progressBar.start(100, 0);

    // Download video
    await downloadVideo(url, outputFile, format, progressCallback);

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
 * @param program - Commander program instance to register the command on
 * @returns void
 */
export function setupDownload(program: Command): void {
  program
    .command('download <url>')
    .alias('dl')
    .description('Download video from URL')
    .option('-o, --output <file>', 'Output file name')
    .option('--format <format>', 'Select format (mp4, mkv, mp3)', 'mp4')
    .action(downloadAction);
}
