#!/usr/bin/env node

import { createRequire } from 'module';

import { Command } from 'commander';

import { setupAudio } from '../commands/audio';
import { setupCompact } from '../commands/compact';
import { setupCompress } from '../commands/compress';
import { setupConvert } from '../commands/convert';
import { setupDownload } from '../commands/download';
import { setupSlice } from '../commands/slice';
import { setupSpeedup } from '../commands/speedup';

/* Create require function for ESM modules */
const require = createRequire(import.meta.url);
/* Load package.json for version info */
const packageJson = require('../package.json');

/* Initialize CLI program */
const program = new Command();

/* Configure the program */
program
  .name('vdo')
  .description('A Node.js CLI tool for video utilities using yt-dlp and ffmpeg')
  .version(packageJson.version, '-v, --version');

/* Setup all commands */
setupDownload(program);
setupConvert(program);
setupCompress(program);
setupCompact(program);
setupSpeedup(program);
setupSlice(program);
setupAudio(program);

/* Add help examples */
program.addHelpText(
  'after',
  `

Examples:
  $ vdo download https://youtube.com/watch?v=example -o myvideo.mp4
  $ vdo convert input.avi --format mp4 --preset fast
  $ vdo compress video.mp4 --crf 23 --preset slow
  $ vdo compact video.mp4 --target 25MB --discord
  $ vdo slice video.mp4 --start 10 --end 30 --precise
  $ vdo speedup video.mp4 --rate 1.5
  $ vdo audio video.mp4 --format mp3 --bitrate 320k

For more information, visit: https://github.com/vijayhardaha/vdo-cli
`
);

/* Parse command line arguments */
program.parse(process.argv);

/* check: if no command provided, show help */
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
