import { log } from './log';

/**
 * Prompt user for confirmation
 *
 * @param {string} message - The message to display
 * @returns {Promise<boolean>} - true if user confirms (Y), false if user declines (n)
 */
export async function promptOverwrite(message: string): Promise<boolean> {
  const response = await new Promise<string>((resolve) => {
    process.stdout.write(`${message} (Y/n) `);

    const handler = (data: Buffer) => {
      process.stdin.removeListener('data', handler);
      resolve(data.toString().trim().toLowerCase());
    };

    process.stdin.on('data', handler);
  });

  if (response === '' || response === 'y' || response === 'yes') {
    return true;
  }

  return false;
}

/**
 * Check if any output files exist and prompt for overwrite
 *
 * @param {string[]} outputPaths - Array of output file paths to check
 * @returns {Promise<boolean>} - true if should proceed, false if should abort
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

  const fileList =
    existingFiles.length <= 3
      ? existingFiles.join(', ')
      : `${existingFiles.slice(0, 3).join(', ')} and ${existingFiles.length - 3} more`;

  const confirmed = await promptOverwrite(`The following files already exist: ${fileList}. Do you want to overwrite?`);

  if (!confirmed) {
    log.info('Operation cancelled.');
    return false;
  }

  return true;
}
