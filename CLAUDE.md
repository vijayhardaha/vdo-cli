# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

`vdo` is a Node.js CLI for video utilities (download, convert, compress, speedup, audio extraction) wrapping `yt-dlp` and `ffmpeg`. TypeScript + ESM, built with Vite, tested with Vitest.

## Common Commands

```bash
pnpm dev -- <command>   # Run CLI in development (no build needed)
pnpm build              # Build to dist/bin/vdo.js
pnpm test               # Vitest watch mode
pnpm test:run           # Vitest single run
pnpm test:coverage      # Coverage report
pnpm typecheck          # TypeScript check (no emit)
pnpm lint               # ESLint check
pnpm lint:fix           # ESLint auto-fix
```

## Architecture

```
src/
├── bin/vdo.ts          # Entry point, wires up Commander
├── commands/*.ts       # Each: setup<Name>(program) + <name>Action()
├── utils/
│   ├── dependencies.ts # checkDependencies(), runCommand()
│   ├── validations.ts  # Input validation helpers
│   ├── progress.ts     # Progress bar utilities
│   ├── ffmpeg.ts       # FFmpeg wrappers
│   └── ytdlp.ts        # yt-dlp wrappers
└── types/index.ts      # All shared interfaces
```

**Key patterns:**

- Commands call `checkDependencies()` first, validate inputs, then call utils
- All actions catch errors and use `process.exit(1)` on failure
- Error handling: `error instanceof Error ? error.message : String(error)`
- Tests mock all external dependencies (no real ffmpeg/yt-dlp processes)

## Coding Requirements

- **ESM imports with `.js` extension**: `import { foo } from './bar.js'` (even for `.ts` files)
- **Strict TypeScript**: No `any` without `// eslint-disable` comment
- **Type imports for types**: `import type { Foo } from './types.js'`
- **Command action flow**: checkDependencies → validate → execute → success message

## External Dependencies

System tools (must be installed on host):

- `ffmpeg` - Video processing
- `yt-dlp` - Video downloading

Install via: `brew install ffmpeg yt-dlp`
