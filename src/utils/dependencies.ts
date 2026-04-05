import { exec, spawn } from 'child_process';

import { log } from './log';
import type { DependencyCheck, CommandResult } from '../types/index';

/**
 * Check if a command exists in the system PATH
 *
 * @param {string} command - Command name to check (e.g., 'ffmpeg', 'yt-dlp')
 * @returns {Promise<boolean>} - True if command exists, false otherwise
 */
export function checkCommand(command: string): Promise<boolean> {
  return new Promise((resolve) => {
    exec(`which ${command}`, (error) => {
      resolve(!error);
    });
  });
}

/**
 * Check if required dependencies (ffmpeg and yt-dlp) are installed
 *
 * @returns {Promise<DependencyCheck>} - Object with ok status and array of missing dependencies
 */
export async function checkDependencies(): Promise<DependencyCheck> {
  const missing: string[] = [];

  const ffmpegInstalled = await checkCommand('ffmpeg');
  if (!ffmpegInstalled) {
    missing.push('ffmpeg');
  }

  const ytdlpInstalled = await checkCommand('yt-dlp');
  if (!ytdlpInstalled) {
    missing.push('yt-dlp');
  }

  return { ok: missing.length === 0, missing };
}

/**
 * Run a shell command and capture stdout/stderr output
 *
 * @param {string} command - Shell command to execute
 * @param {((data: string, type: 'stdout' | 'stderr') => void) | null} [onOutput=null] - Optional callback function for real-time output handling (receives data chunks and type)
 * @returns {Promise<CommandResult>} - Object containing stdout and stderr strings
 * @throws {Error} If command exits with non-zero code or process error occurs
 */
export function runCommand(
  command: string,
  onOutput: ((data: string, type: 'stdout' | 'stderr') => void) | null = null
): Promise<CommandResult> {
  return new Promise((resolve, reject) => {
    const childProcess = spawn(command, { shell: true });
    let stdout = '';
    let stderr = '';

    childProcess.stdout.on('data', (data: Buffer) => {
      stdout += data.toString();
      if (onOutput) {
        onOutput(data.toString(), 'stdout');
      }
    });

    childProcess.stderr.on('data', (data: Buffer) => {
      stderr += data.toString();
      if (onOutput) {
        onOutput(data.toString(), 'stderr');
      }
    });

    childProcess.on('close', (code: number | null) => {
      if (code === 0) {
        resolve({ stdout, stderr });
      } else {
        reject(new Error(`Command failed with code ${code}: ${stderr}`));
      }
    });

    childProcess.on('error', (err: Error) => {
      reject(err);
    });
  });
}

/**
 * Ensure dependencies are available, exit with error if missing
 *
 * @returns {Promise<boolean>} true if all dependencies are available
 * @throws {void} Exits with code 1 if dependencies are missing
 */
export async function ensureDependencies(): Promise<boolean> {
  const deps = await checkDependencies();
  if (!deps.ok) {
    log.fail(`Missing dependencies: ${deps.missing.join(', ')}`);
    log.warn('Install using: brew install ffmpeg yt-dlp');
    process.exit(1);
  }
  return true;
}
