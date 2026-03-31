import { exec, spawn } from 'child_process';
import type { DependencyCheck, CommandResult } from '../types/index.js';

/**
 * Check if a command exists
 * @param command - Command to check
 * @returns Promise<boolean>
 */
export function checkCommand(command: string): Promise<boolean> {
  return new Promise(resolve => {
    exec(`which ${command}`, error => {
      resolve(!error);
    });
  });
}

/**
 * Check if required dependencies are installed
 * @returns Promise<DependencyCheck>
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

  return {
    ok: missing.length === 0,
    missing,
  };
}

/**
 * Run a command and capture output
 * @param command - Command to run
 * @param onOutput - Callback for output lines
 * @returns Promise<CommandResult>
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
