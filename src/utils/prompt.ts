import * as readline from 'node:readline';

import { log } from '@/utils/log';

/**
 * Prompt user for confirmation.
 *
 * @param {string} message - The message to display.
 *
 * @returns {Promise<boolean>} - True if user confirms (Y), false if user declines (n).
 */
export async function promptOverwrite(message: string): Promise<boolean> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  const response = await new Promise<string>((resolve) => {
    rl.question(`${message} (Y/n) `, (answer) => {
      resolve(answer);
    });
  });

  rl.close();

  const normalized = response.trim().toLowerCase();
  return normalized === '' || normalized === 'y' || normalized === 'yes';
}

/**
 * Check if any output files exist and prompt for overwrite.
 *
 * @param {string[]} outputPaths - Array of output file paths to check.
 *
 * @returns {Promise<boolean>} - True if should proceed, false if should abort.
 */
export async function checkAndPromptOverwrite(outputPaths: string[]): Promise<boolean> {
  const fs = await import('fs/promises');
  const path = await import('path');

  const existingFiles: string[] = [];

  for (const outputPath of outputPaths) {
    try {
      await fs.access(outputPath);
      existingFiles.push(path.basename(outputPath));
    } catch {
      // File doesn't exist, continue
    }
  }

  if (existingFiles.length === 0) {
    return true;
  }

  const fileList = existingFiles.map((f) => `  - ${f}`).join('\n');

  log.info(`The following files already exist:\n${fileList}`);

  const confirmed = await promptOverwrite(`Do you want to overwrite?`);

  if (!confirmed) {
    log.info('Operation cancelled.');
    return false;
  }

  return true;
}
