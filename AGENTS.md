# AGENTS.md

This document is the authoritative reference for AI agents (Copilot, Claude, Cursor, Qoder, etc.)
working on the `vdo` codebase. Read it fully before making any changes.

---

## Project Overview

`vdo` is a Node.js CLI tool for video utilities built with **TypeScript** and **ES modules**.
It wraps `yt-dlp` (downloading) and `ffmpeg` (processing) with a clean git-style subcommand
interface powered by Commander.js.

- **Runtime:** Node.js ≥ 18, ESM only (`"type": "module"`)
- **Package manager:** pnpm (`packageManager: "pnpm@10.33.0"`)
- **Node version:** `.nvmrc` pins `v24`
- **Language:** TypeScript 5, strict mode, `moduleResolution: bundler`
- **Build:** Vite (SSR/Node target) → `dist/bin/vdo.js`
- **Tests:** Vitest (globals enabled, node environment)
- **Linting:** ESLint flat config (`eslint.config.mjs`) + `@typescript-eslint`
- **Formatting:** Prettier (`prettier.config.mjs`)

---

## Repository Layout

```
vdo-cli/
├── src/
│   ├── bin/
│   │   └── vdo.ts            # CLI entry point — wires up all commands
│   ├── commands/
│   │   ├── download.ts       # vdo download <url>
│   │   ├── convert.ts        # vdo convert <input>
│   │   ├── compress.ts       # vdo compress <input>
│   │   ├── speedup.ts        # vdo speedup <input>
│   │   ├── audio.ts          # vdo audio <input>
│   │   └── auto.ts           # vdo auto <input|url>
│   ├── utils/
│   │   ├── dependencies.ts   # checkCommand, checkDependencies, runCommand
│   │   ├── validations.ts    # all input validation helpers
│   │   ├── progress.ts       # createProgressBar, parseFFmpegProgress, parseYtDlpProgress
│   │   ├── ffmpeg.ts         # convertVideo, compressVideo, speedUpVideo, extractAudio
│   │   └── ytdlp.ts          # downloadVideo, getVideoInfo, isSupportedURL
│   └── types/
│       └── index.ts          # all shared interfaces and type aliases
├── tests/
│   ├── validations.test.ts
│   ├── progress.test.ts
│   └── commands.test.ts
├── dist/                     # Vite build output (gitignored)
│   └── bin/vdo.js
├── tsconfig.json             # src/ compilation (strict, ESNext, bundler resolution)
├── tsconfig.node.json        # extends tsconfig.json — covers vite/vitest config files
├── vite.config.ts            # SSR build, externalises Node builtins + deps
├── vitest.config.ts          # test runner config
├── vitest.setup.ts           # global test setup (console mocks)
├── eslint.config.mjs         # flat ESLint config
├── prettier.config.mjs       # Prettier config
├── .prettierignore
├── .nvmrc                    # v24
├── .vscode/settings.json     # format-on-save, ESLint fix-on-save
├── LICENSE                   # MIT
└── package.json
```

---

## Architecture

### Command Flow

```
src/bin/vdo.ts
  └── Commander program
        ├── setupDownload(program)  →  src/commands/download.ts
        ├── setupConvert(program)   →  src/commands/convert.ts
        ├── setupCompress(program)  →  src/commands/compress.ts
        ├── setupSpeedup(program)   →  src/commands/speedup.ts
        ├── setupAudio(program)     →  src/commands/audio.ts
        └── setupAuto(program)     →  src/commands/auto.ts
```

Each command module exports:

- `setup<Name>(program: Command): void` — registers the subcommand and options
- `<name>Action(input, options): Promise<void>` — the actual async handler

### Utility Layer

```
src/utils/
  dependencies.ts  →  used by every command (dep check + runCommand)
  validations.ts   →  used by every command (validate inputs before executing)
  progress.ts      →  used by download, convert, compress, speedup, auto
  ffmpeg.ts        →  used by convert, compress, speedup, audio, auto
  ytdlp.ts         →  used by download, auto
```

### Types

All shared types live in `src/types/index.ts`. Each command option object has its own
interface (`DownloadOptions`, `ConvertOptions`, etc.). Never use `any` — add a proper type.

---

## Commands Reference

| Command             | Alias | Description                    | Key Options                                 |
| ------------------- | ----- | ------------------------------ | ------------------------------------------- |
| `download <url>`    | `dl`  | Download from URL via yt-dlp   | `-o`, `--format` (mp4/mkv/mp3)              |
| `convert <input>`   | `cv`  | Convert local video via ffmpeg | `--to`, `--preset`, `-o`                    |
| `compress <input>`  | `cm`  | Compress with CRF via ffmpeg   | `--crf` (0–51), `--preset`, `-o`            |
| `speedup <input>`   | `sp`  | Change playback speed          | `--rate` (>0, ≤16), `-o`                    |
| `audio <input>`     | `au`  | Extract audio track            | `--format` (mp3/wav/aac), `--bitrate`, `-o` |
| `auto <input\|url>` | `a`   | Auto-detect URL vs file        | `--format`, `-o`                            |

---

## Development Workflow

### Install dependencies

```bash
pnpm install
```

### Run in development (no build needed)

```bash
pnpm dev -- download https://example.com/video
# or
npx tsx src/bin/vdo.ts --help
```

### Build

```bash
pnpm build
# output: dist/bin/vdo.js
```

### Type-check (no emit)

```bash
pnpm typecheck
```

### Test

```bash
pnpm test          # watch mode
pnpm test:run      # single run
pnpm test:coverage # coverage report → coverage/
```

### Lint & Format

```bash
pnpm lint          # ESLint check
pnpm lint:fix      # ESLint auto-fix
pnpm format        # Prettier write
pnpm format:check  # Prettier check only
```

---

## Coding Conventions

### Imports

- Always use **ESM** `import`/`export` — no `require()` except in `src/bin/vdo.ts` where
  `createRequire` is used to load `package.json`.
- Use `.js` extensions on relative imports even for `.ts` source files — TypeScript resolves
  them correctly under `moduleResolution: bundler`.

  ```ts
  // correct
  import { runCommand } from './dependencies.js';

  // wrong
  import { runCommand } from './dependencies';
  ```

### TypeScript

- All files are strict TypeScript — no `any` without a `// eslint-disable` comment and
  justification.
- Use `type` imports for interfaces/types that are not used as values:
  ```ts
  import type { DownloadOptions } from '../types/index.js';
  ```
- Error handling in command actions must use the pattern:
  ```ts
  error instanceof Error ? error.message : String(error);
  ```

### Command Actions

Every action must:

1. Call `checkDependencies()` first and `process.exit(1)` if deps are missing.
2. Validate all inputs before spawning any process.
3. Catch errors and print `\n✗ Error: <message>` to `console.error`, then `process.exit(1)`.
4. Print `\n✓ <Action> completed successfully!` on success.

### Adding a New Command

1. Create `src/commands/<name>.ts` following the existing pattern (export `setup<Name>` and
   `<name>Action`).
2. Add the option interface to `src/types/index.ts`.
3. Import and call `setup<Name>(program)` in `src/bin/vdo.ts`.
4. Add a test file `tests/<name>.test.ts`.

### Adding a New Utility

1. Create `src/utils/<name>.ts` with named exports only.
2. Add any shared types to `src/types/index.ts`.
3. Do not import from `commands/` inside `utils/` — keep the dependency direction one-way.

---

## External Dependencies

### System (must be installed on host)

| Tool     | Purpose                                                       | Install               |
| -------- | ------------------------------------------------------------- | --------------------- |
| `ffmpeg` | Video conversion, compression, speed change, audio extraction | `brew install ffmpeg` |
| `yt-dlp` | Video downloading from URLs                                   | `brew install yt-dlp` |

Dependency presence is checked at runtime via `checkDependencies()` in
`src/utils/dependencies.ts` before any command executes.

### npm Runtime

| Package        | Purpose                                              |
| -------------- | ---------------------------------------------------- |
| `commander`    | CLI argument parsing and subcommand structure        |
| `cli-progress` | Real-time progress bars (download/ffmpeg processing) |
| `ora`          | Spinner for tasks without clear progress             |
| `axios`        | HTTP utility (available for future use)              |

### npm Dev

| Package                           | Purpose                                           |
| --------------------------------- | ------------------------------------------------- |
| `typescript`                      | TypeScript compiler                               |
| `vite`                            | Build tool (SSR/Node target)                      |
| `vitest`                          | Test runner                                       |
| `@vitest/coverage-v8`             | Coverage provider                                 |
| `tsx`                             | Execute TypeScript directly (used by `pnpm dev`)  |
| `eslint` + `@typescript-eslint/*` | Linting                                           |
| `eslint-config-prettier`          | Disables ESLint rules that conflict with Prettier |
| `prettier`                        | Code formatting                                   |
| `@types/node`                     | Node.js type declarations                         |
| `@types/cli-progress`             | Type declarations for cli-progress                |

---

## Testing Guidelines

- Test files live in `tests/` and match the pattern `*.test.ts`.
- Vitest globals are enabled — `describe`, `it`, `expect`, `vi`, etc. are available without
  importing.
- `vitest.setup.ts` mocks `console.log/error/warn/info` globally to keep test output clean.
- Unit-test **utility functions** directly (validations, progress parsers). Do not spawn real
  `ffmpeg`/`yt-dlp` processes in tests — mock `runCommand` if needed.
- Command tests verify command registration (options, aliases, names) via Commander's
  `program.commands` API.

---

## Build Notes

- Vite is configured in **SSR mode** (`ssr: true`) so Node.js built-ins are not mocked for
  the browser.
- All Node.js builtins are externalized via `builtinModules` from `node:module`.
- All runtime npm packages are also externalized — the build output is not self-contained;
  `node_modules` must be present at runtime.
- The `__dirname` equivalent inside the built file is derived from `import.meta.url`.

---

## Environment Notes

- **Node version:** Use `nvm use` — `.nvmrc` pins `v24`.
- **Package manager:** Always use `pnpm`. Never commit a `package-lock.json` or `yarn.lock`.
- **Module system:** ESM only. Do not add `"type": "commonjs"` or `.cjs` files.
