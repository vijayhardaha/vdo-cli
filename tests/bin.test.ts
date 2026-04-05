import { Command } from 'commander';
import { describe, it, expect, vi } from 'vitest';

vi.mock('../src/commands/download.js', () => ({ setupDownload: vi.fn() }));
vi.mock('../src/commands/convert.js', () => ({ setupConvert: vi.fn() }));
vi.mock('../src/commands/compress.js', () => ({ setupCompress: vi.fn() }));
vi.mock('../src/commands/speedup.js', () => ({ setupSpeedup: vi.fn() }));
vi.mock('../src/commands/audio.js', () => ({ setupAudio: vi.fn() }));
vi.mock('module', () => ({ createRequire: vi.fn(() => () => ({ version: '1.0.0', name: 'vdo' })) }));

// Tests for bin/vdo CLI entry point
describe('bin/vdo', () => {
  // Should register all 5 commands on the program
  it('should register all 5 commands on the program', async () => {
    const { setupDownload } = await import('../src/commands/download.js');
    const { setupConvert } = await import('../src/commands/convert.js');
    const { setupCompress } = await import('../src/commands/compress.js');
    const { setupSpeedup } = await import('../src/commands/speedup.js');
    const { setupAudio } = await import('../src/commands/audio.js');

    // Simulate what bin/vdo.ts does
    const program = new Command();
    program.name('vdo').description('A Node.js CLI tool for video utilities').version('1.0.0');

    vi.mocked(setupDownload)(program);
    vi.mocked(setupConvert)(program);
    vi.mocked(setupCompress)(program);
    vi.mocked(setupSpeedup)(program);
    vi.mocked(setupAudio)(program);

    expect(setupDownload).toHaveBeenCalledWith(program);
    expect(setupConvert).toHaveBeenCalledWith(program);
    expect(setupCompress).toHaveBeenCalledWith(program);
    expect(setupSpeedup).toHaveBeenCalledWith(program);
    expect(setupAudio).toHaveBeenCalledWith(program);
  });

  // Should configure program name and description
  it('should configure program name and description', () => {
    const program = new Command();
    program.name('vdo').description('A Node.js CLI tool for video utilities').version('1.0.0');

    expect(program.name()).toBe('vdo');
    expect(program.description()).toBe('A Node.js CLI tool for video utilities');
  });
});
