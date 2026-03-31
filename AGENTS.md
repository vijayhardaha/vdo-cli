# AGENTS.md

This document is the authoritative reference for AI agents working on the `vdo` codebase.

## Project Overview

`vdo` is a Node.js CLI for video utilities wrapping `yt-dlp` (download) and `ffmpeg` (convert/compress/speedup/audio).

- **Runtime:** Node.js ≥ 18, ESM only, pnpm package manager
- **Language:** TypeScript 5, strict mode, `moduleResolution: bundler`
- **Build:** Vite (SSR/Node target) → `dist/bin/vdo.js`
- **Tests:** Vitest with globals enabled

## Commands

| Command             | Alias | Description             | Key Options                   |
| ------------------- | ----- | ----------------------- | ----------------------------- |
| `download <url>`    | `dl`  | Download from URL       | `-o`, `--format`              |
| `convert <input>`   | `cv`  | Convert video format    | `--to`, `--preset`, `-o`      |
| `compress <input>`  | `cm`  | Compress with CRF       | `--crf`, `--preset`, `-o`     |
| `speedup <input>`   | `sp`  | Change playback speed   | `--rate`, `-o`                |
| `audio <input>`     | `au`  | Extract audio           | `--format`, `--bitrate`, `-o` |
| `auto <input\|url>` | `a`   | Auto-detect URL vs file | `--format`, `-o`              |

## Architecture

```
src/
├── bin/vdo.ts           # Entry point, wires up Commander
├── commands/*.ts        # setup<Name>() + <name>Action()
├── utils/
│   ├── dependencies.ts  # checkDependencies(), runCommand()
│   ├── validations.ts   # Input validation helpers
│   ├── progress.ts      # Progress bar utilities
│   ├── ffmpeg.ts        # FFmpeg wrappers
│   └── ytdlp.ts         # yt-dlp wrappers
└── types/index.ts       # All shared interfaces
```

**Dependency flow:** `commands/` → `utils/` → `types/` (one-way only)

## Development Commands

```bash
pnpm dev -- <command>   # Run CLI in development
pnpm build               # Build to dist/bin/vdo.js
pnpm test                # Vitest watch mode
pnpm test:run            # Vitest single run
pnpm typecheck           # TypeScript check
pnpm lint                # ESLint check
pnpm lint:fix            # ESLint auto-fix
```

## Coding Conventions

### Imports

- **ESM with `.js` extension** (even for `.ts` files):
  ```ts
  import { runCommand } from './dependencies.js'; // correct
  import { runCommand } from './dependencies'; // wrong
  ```

### TypeScript

- Strict mode, no `any` without `// eslint-disable` comment
- Use type imports: `import type { Foo } from './types.js'`
- Error handling pattern: `error instanceof Error ? error.message : String(error)`

### Command Actions

Every action must:

1. Call `checkDependencies()` first → `process.exit(1)` if missing
2. Validate all inputs before spawning processes
3. Catch errors → `console.error('\n✗ Error: <message>')` → `process.exit(1)`
4. On success → `console.log('\n✓ <Action> completed successfully!')`

## Testing

- Test files in `tests/` matching `*.test.ts`
- Vitest globals available without importing (`describe`, `it`, `expect`, `vi`)
- Mock all external dependencies (no real ffmpeg/yt-dlp processes)
- `vitest.setup.ts` mocks `console.*` globally

## External Dependencies

System (must be installed on host):

- `ffmpeg` - Video processing
- `yt-dlp` - Video downloading

Install: `brew install ffmpeg yt-dlp`

## Adding New Commands

1. Create `src/commands/<name>.ts` with `setup<Name>()` and `<name>Action()`
2. Add interface to `src/types/index.ts`
3. Import and call `setup<Name>(program)` in `src/bin/vdo.ts`
4. Add test file `tests/<name>.test.ts`
