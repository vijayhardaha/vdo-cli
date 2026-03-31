import type { Command } from 'commander';
import ora from 'ora';
import { resolve, dirname, basename, extname, join } from 'path';
import { checkDependencies } from '../utils/dependencies.js';
import { validateFileExists, validateSpeedRate } from '../utils/validations.js';
import { speedUpVideo } from '../utils/ffmpeg.js';
import { createProgressBar } from '../utils/progress.js';
import type { SpeedupOptions } from '../types/index.js';

/**
 * Speedup action - speeds up or slows down video playback using ffmpeg
 *
 * @param {string} input - Path to the input video file
 * @param {SpeedupOptions} options - Speed adjustment configuration options including output filename and speed rate
 * @returns {Promise<void>} Promise that resolves when speed adjustment is complete
 * @throws {void} Exits process with code 1 if dependencies missing, file not found, invalid speed rate, or operation fails
 */
export async function speedupAction(input: string, options: SpeedupOptions): Promise<void> {
  try {
    // Check dependencies
    const deps = await checkDependencies();
    if (!deps.ok) {
      console.error(`Error: Missing required dependencies: ${deps.missing.join(', ')}`);
      console.error('Please install them using:');
      console.error('  brew install ffmpeg yt-dlp');
      process.exit(1);
    }

    // Validate input file
    await validateFileExists(input);

    // Validate speed rate
    const rate = options.rate || 2;
    validateSpeedRate(rate);

    // Determine output filename
    let outputFile = options.output;
    if (!outputFile) {
      const dir = dirname(input);
      const name = basename(input, extname(input));
      outputFile = join(dir, `${name}_${rate}x.mp4`);
    }

    // Show spinner while preparing
    const spinner = ora('Preparing speed adjustment...').start();

    const progressCallback = (percentage: number) => {
      if (progressBar && percentage > 0) {
        progressBar.update(percentage);
      }
    };

    spinner.succeed('Speed adjustment started');

    // Create progress bar
    const progressBar = createProgressBar('Processing');
    progressBar.start(100, 0);

    // Speed up video
    await speedUpVideo(input, outputFile, rate, progressCallback);

    progressBar.stop();
    console.log('\n✓ Speed adjustment completed successfully!');
    console.log(`  Output file: ${resolve(outputFile)}`);
    console.log(`  Speed rate: ${rate}x`);

    if (rate > 1) {
      console.log(`  Result: Video is ${rate}x faster`);
    } else if (rate < 1) {
      console.log(`  Result: Video is ${(1 / rate).toFixed(2)}x slower`);
    }
  } catch (error) {
    console.error('\n✗ Error:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

/**
 * Setup speedup command with Commander.js
 *
 * @param {Command} program - Commander program instance to register the command on
 * @returns {void}
 */
export function setupSpeedup(program: Command): void {
  program
    .command('speedup <input>')
    .alias('sp')
    .description('Speed up or slow down video')
    .option('-o, --output <file>', 'Output file name')
    .option('--rate <value>', 'Speed rate (e.g., 2 for 2x faster, 0.5 for 2x slower)', '2')
    .action(speedupAction);
}
