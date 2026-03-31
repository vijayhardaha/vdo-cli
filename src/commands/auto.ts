import type { Command } from 'commander';
import ora from 'ora';
import { resolve, dirname, basename, extname, join } from 'path';
import { access } from 'fs/promises';
import { checkDependencies } from '../utils/dependencies.js';
import { validateUrl } from '../utils/validations.js';
import { downloadVideo } from '../utils/ytdlp.js';
import { convertVideo } from '../utils/ffmpeg.js';
import { createProgressBar } from '../utils/progress.js';
import type { AutoOptions } from '../types/index.js';

export async function autoAction(input: string, options: AutoOptions): Promise<void> {
  try {
    // Check dependencies
    const deps = await checkDependencies();
    if (!deps.ok) {
      console.error(`Error: Missing required dependencies: ${deps.missing.join(', ')}`);
      console.error('Please install them using:');
      console.error('  brew install ffmpeg yt-dlp');
      process.exit(1);
    }

    const spinner = ora('Detecting input type...').start();

    let isURL = false;
    let inputFileExists = false;

    // Check if input is a URL
    if (validateUrl(input)) {
      isURL = true;
      spinner.text = 'URL detected, preparing to download...';
    } else {
      // Check if it's a local file
      try {
        await access(input);
        inputFileExists = true;
        spinner.text = 'Local file detected, preparing to process...';
      } catch {
        spinner.fail('Input is neither a valid URL nor an existing file');
        console.error('Error: Please provide a valid URL or path to an existing file.');
        process.exit(1);
      }
    }

    spinner.succeed(isURL ? 'URL detected' : 'Local file detected');

    if (isURL) {
      // Download from URL
      const format = options.format || 'mp4';
      const outputFile = options.output || `download.${format}`;

      const progressBar = createProgressBar('Downloading');
      progressBar.start(100, 0);

      const progressCallback = (percentage: number, size: number, unit: string) => {
        const totalMB = unit === 'MiB' ? size : unit === 'KiB' ? size / 1024 : size * 1024;
        const currentMB = Math.round((percentage / 100) * totalMB);
        progressBar.update(currentMB, { total: Math.round(totalMB) });
      };

      await downloadVideo(input, outputFile, format, progressCallback);

      progressBar.stop();
      console.log('\n✓ Download completed successfully!');
      console.log(`  Output file: ${resolve(outputFile)}`);
    } else if (inputFileExists) {
      // Process local file
      // Default action: convert to MP4
      const targetFormat = 'mp4';
      let outputFile = options.output;

      if (!outputFile) {
        const dir = dirname(input);
        const name = basename(input, extname(input));
        outputFile = join(dir, `${name}_auto.${targetFormat}`);
      }

      const convertSpinner = ora('Converting video...').start();

      const progressCallback = (percentage: number) => {
        if (progressBar && percentage > 0) {
          progressBar.update(percentage);
        }
      };

      convertSpinner.succeed('Conversion started');

      const progressBar = createProgressBar('Converting');
      progressBar.start(100, 0);

      await convertVideo(input, outputFile, targetFormat, 'fast', progressCallback);

      progressBar.stop();
      console.log('\n✓ Conversion completed successfully!');
      console.log(`  Output file: ${resolve(outputFile)}`);
    }
  } catch (error) {
    console.error('\n✗ Error:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

export function setupAuto(program: Command): void {
  program
    .command('auto <input|url>')
    .alias('a')
    .description('Automatically detect URL vs local file and perform appropriate action')
    .option('-o, --output <file>', 'Output file name')
    .option('--format <format>', 'Format for downloads (mp4, mkv, mp3)', 'mp4')
    .action(autoAction);
}
