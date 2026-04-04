#!/usr/bin/env node

import { createRequire } from 'module';

import { Command } from 'commander';

import { setupAudio } from '../commands/audio.js';
import { setupCompress } from '../commands/compress.js';
import { setupConvert } from '../commands/convert.js';
import { setupDownload } from '../commands/download.js';
import { setupSpeedup } from '../commands/speedup.js';

const require = createRequire(import.meta.url);
const packageJson = require('../package.json');

// Create the CLI program
const program = new Command();

/**
 * Configure and run the VDO CLI program
 *
 * @returns {void}
 */

// Configure the program
program
  .name('vdo')
  .description('A Node.js CLI tool for video utilities using yt-dlp and ffmpeg')
  .version(packageJson.version, '-v, --version');

// Setup all commands
setupDownload(program);
setupConvert(program);
setupCompress(program);
setupSpeedup(program);
setupAudio(program);

// Add some examples
program.addHelpText(
  'after',
  `

Examples:
  $ vdo download https://youtube.com/watch?v=example -o myvideo.mp4
  $ vdo convert input.avi --to mp4 --preset fast
  $ vdo compress video.mp4 --crf 23 --preset slow
  $ vdo speedup video.mp4 --rate 1.5
  $ vdo audio video.mp4 --format mp3 --bitrate 320k

For more information, visit: https://github.com/vijayhardaha/vdo-cli
`
);

// Parse command line arguments
program.parse(process.argv);

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
