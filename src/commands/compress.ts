import type { Command } from 'commander';
import ora from 'ora';
import { resolve, dirname, basename, extname, join } from 'path';
import { checkDependencies } from '../utils/dependencies.js';
import { validateFileExists, validatePreset, validateCRF } from '../utils/validations.js';
import { compressVideo } from '../utils/ffmpeg.js';
import { createProgressBar } from '../utils/progress.js';
import type { CompressOptions } from '../types/index.js';

const ALLOWED_PRESETS = ['ultrafast', 'fast', 'medium', 'slow'];

export async function compressAction(input: string, options: CompressOptions): Promise<void> {
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

    // Validate CRF
    const crf = options.crf || 28;
    validateCRF(crf);

    // Validate preset
    const preset = options.preset || 'medium';
    validatePreset(preset, ALLOWED_PRESETS);

    // Determine output filename
    let outputFile = options.output;
    if (!outputFile) {
      const dir = dirname(input);
      const name = basename(input, extname(input));
      outputFile = join(dir, `${name}_compressed.mp4`);
    }

    // Show spinner while preparing
    const spinner = ora('Preparing compression...').start();

    const progressCallback = (percentage: number) => {
      if (progressBar && percentage > 0) {
        progressBar.update(percentage);
      }
    };

    spinner.succeed('Compression started');

    // Create progress bar
    const progressBar = createProgressBar('Compressing');
    progressBar.start(100, 0);

    // Compress video
    await compressVideo(input, outputFile, crf, preset, progressCallback);

    progressBar.stop();
    console.log('\n✓ Compression completed successfully!');
    console.log(`  Output file: ${resolve(outputFile)}`);
    console.log(`  CRF: ${crf}`);
    console.log(`  Preset: ${preset}`);
  } catch (error) {
    console.error('\n✗ Error:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

export function setupCompress(program: Command): void {
  program
    .command('compress <input>')
    .alias('cm')
    .description('Compress video to reduce file size')
    .option('-o, --output <file>', 'Output file name')
    .option('--crf <value>', 'Constant Rate Factor (0-51, lower = better quality)', '28')
    .option('--preset <preset>', 'Encoding preset (ultrafast, fast, medium, slow)', 'medium')
    .action(compressAction);
}
