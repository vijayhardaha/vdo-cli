# AGENTS.md

> **This file serves as the authoritative reference for AI agents (Cursor, Claude Code, etc.) working on the `vdo` codebase.**

## Project Overview

`vdo` is a Node.js CLI for video utilities wrapping `yt-dlp` (download) and `ffmpeg` (convert/compress/slice/split/speedup/audio).

- **Runtime:** Node.js ≥ 20, ESM only, bun package manager
- **Language:** TypeScript 6, strict mode, `moduleResolution: bundler`
- **Build:** Vite (SSR/Node target) → `dist/vdo.js`
- **Tests:** Vitest with globals enabled, V8 coverage at 100% statements/branches/functions/lines

## Commands

| Command            | Alias | Description            | Key Options                                                                                      |
| ------------------ | ----- | ---------------------- | ------------------------------------------------------------------------------------------------ |
| `download <url>`   | `dl`  | Download from URL      | `-o`, `--format`, `--convert`, `--split`, `--cookies`                                            |
| `convert <input>`  | `cvt` | Convert video format   | `--format`, `--preset`, `-o`                                                                     |
| `compress <input>` | `cps` | Compress with CRF      | `--crf`, `--preset`, `-o`                                                                        |
| `compact <input>`  | `cpt` | Compact to target size | `--target`, `--percent`, `--discord`, `--quality`, `--preset`, `--audio-bitrate`, `--hevc`, `-o` |
| `slice <input>`    | `slc` | Slice/trim segment     | `--start`, `--end`, `--duration`, `--segments`, `--fast`, `--precise`, `--codec`, `-o`           |
| `split <input>`    | `spl` | Split into parts       | `--preset`, `--duration`, `--fast`, `--precise`, `--codec`, `-o`                                 |
| `speedup <input>`  | `sup` | Change playback speed  | `--rate`, `-o`                                                                                   |
| `audio <input>`    | `au`  | Extract audio          | `--format`, `--bitrate`, `-o`                                                                    |

### Download Command Options

- `--format <format>` - mp4, mkv, webm, avi, mov, mp3
- `--output <file>` - Custom output filename
- `--convert` - Convert downloaded file after download
- `--split <value>` - Split after download (ig/wa/fb/instagram/whatsapp/facebook or seconds)
- `--cookies <browser>` - Load cookies from browser (chrome/firefox/edge/brave/etc.) for authenticated downloads

## Architecture

```
src/
├── bin/
│   ├── vdo.ts           # Entry point, wires up Commander
│   └── __tests__/       # Tests for bin/vdo.ts
│       └── vdo.test.ts
├── commands/
│   ├── audio.ts         # setupAudio() + audioAction()
│   ├── compact.ts       # setupCompact() + compactAction()
│   ├── compress.ts      # setupCompress() + compressAction()
│   ├── convert.ts       # setupConvert() + convertAction()
│   ├── download.ts      # setupDownload() + downloadAction()
│   ├── slice.ts         # setupSlice() + sliceAction()
│   ├── speedup.ts       # setupSpeedup() + speedupAction()
│   ├── split.ts         # setupSplit() + splitAction()
│   └── __tests__/       # Tests for commands (setup + action tests)
│       ├── audio.test.ts
│       ├── compact.test.ts
│       ├── compress.test.ts
│       ├── convert.test.ts
│       ├── download.test.ts
│       ├── slice.test.ts
│       ├── speedup.test.ts
│       └── split.test.ts
├── utils/
│   ├── __tests__/      # Tests for utilities
│   │   ├── compact.test.ts
│   │   ├── dependencies.test.ts
│   │   ├── ffmpeg.test.ts
│   │   ├── icons.test.ts
│   │   ├── output.test.ts
│   │   ├── progress.test.ts
│   │   ├── prompt.test.ts
│   │   ├── sanitize.test.ts
│   │   ├── slice.test.ts
│   │   ├── split.test.ts
│   │   ├── validations.test.ts
│   │   └── ytdlp.test.ts
│   ├── compact.ts       # Compact/two-pass encoding utilities
│   ├── dependencies.ts  # ensureDependencies(), checkDependencies(), runCommand()
│   ├── ffmpeg.ts        # FFmpeg wrappers (getVideoDuration, convertVideo, compressVideo, speedUpVideo, extractAudio)
│   ├── icons.ts         # Icons (info, success, warning, error, loading)
│   ├── log.ts           # Logging utility (log.succeed, log.fail, etc.) + handleError()
│   ├── output.ts        # Output filename helper (resolveOutputFile)
│   ├── progress.ts      # Progress bar utilities (createProgressBar, createProgressCallback, createFFmpegProgressCallback, parseFFmpegProgress, parseYtDlpProgress, formatFileSize)
│   ├── prompt.ts        # Prompt utilities (checkAndPromptOverwrite, etc.)
│   ├── sanitize.ts      # Filename sanitization (sanitizeFilename)
│   ├── slice.ts         # Slice/trim utilities (parseTimeToSeconds, formatTimeForFFmpeg, sliceVideoStreamCopy, sliceVideoReencode, sliceMultipleSegments)
│   ├── split.ts         # Split utilities (parseSplitValue, getPresetDuration, calculateNumParts, splitVideoStreamCopy, splitVideoReencode)
│   ├── validations.ts   # Input validation helpers (validateUrl, validateFormat, validatePreset, validateCRF, validateSpeedRate, validateBitrate, validateFileExists)
│   └── ytdlp.ts         # yt-dlp wrappers (getVideoInfo, downloadVideo, generateFilename)
└── types/index.ts       # All shared interfaces
```

**Dependency flow:** `commands/` → `utils/` → `types/`; utils may import other utils (e.g., `split.ts` → `progress.ts`, `dependencies.ts`), and command files may cross-import each other (e.g., `download.ts` → `split.ts`).

## Development Commands

```bash
bun run dev            # Run CLI in development
bun run build          # Build to dist/vdo.js
bun run test           # Vitest single run
bun run test:watch     # Vitest watch mode
bun run test:coverage  # Vitest with coverage
bun run tsc            # TypeScript check
bun run lint           # ESLint check
bun run lint:fix       # ESLint auto-fix
bun run format         # Format code
bun run format:check   # Check formatting
bun run release        # Release new version
bun run release:dry    # Dry-run release
```

## Coding Conventions

### Comments

#### JSDoc (for exported functions and complex types)

```ts
/**
 * {Description of what the function does}
 *
 * @param {Type} name - {Description of parameter}
 * @returns {Type} - {Description of return value}
 * @throws {Type} - {Description of when error is thrown}
 */
```

#### Type/Interface Definitions

```ts
/* {Description of the type} */
type Foo = string;

/* {Description of the interface} */
interface Bar {
  prop: string;
}
```

#### Variable Definitions

```ts
/* {Description of the variable} */
const myVar = "value";
```

#### Test Comments (describe, it)

```ts
// Tests for {Test suite name}
describe("foo", () => {
  // Should return {Expected behavior}
  it("should return bar", () => {
    .
    .
    .
    // Expect {What is being tested}
    expect(foo("input")).toBe("bar");
  });
});
```

#### Conditional Check Descriptions

```ts
// check: if user is authenticated
if (isAuthenticated) {
  // do something
}
```

### Naming Conventions

- Components: `PascalCase`
- Functions/variables: `camelCase`
- Files: `kebab-case`
- Constants: `SCREAMING_SNAKE_CASE`

### Imports

ESM imports with `moduleResolution: bundler`:

```ts
import { runCommand } from "./dependencies";
import { log } from "./log";
```

### TypeScript

- Strict mode, no `any` without `// eslint-disable` comment
- Use type imports: `import type { Foo } from './types'`
- Error handling pattern: `error instanceof Error ? error.message : String(error)`

### Command Actions

Every action must:

1. Call `ensureDependencies()` first - handles dependency check, logging, and exit
2. Validate all inputs before spawning processes
3. Catch errors → `log.fail('<message>')` → `process.exit(1)`
4. On success → `log.succeed('<Action> completed successfully!')`

## Testing

### Unit Tests

- Test files in `__tests__/` directories matching `*.test.ts`
- Vitest globals available without importing (`describe`, `it`, `expect`, `vi`)
- Mock all external dependencies (no real ffmpeg/yt-dlp processes)
- `vitest.setup.ts` mocks `console.*` globally
- Coverage config lives in `vitest.config.ts` (`provider: 'v8'`, include `src/**/*.ts`); keep coverage at 100%

### Command Action Test Conventions

Every command test file covers both `setup<Name>()` (Commander registration) and the action/helper
functions. Established patterns:

1. Mock `@/utils/log` as `{ log: { succeed, fail, info, loading, warn }, handleError }` and
   `@/utils/progress` with `createProgressBar: vi.fn(() => ({ start, stop, update, render }))`.
2. In each test, `exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never)` and restore it
   in `afterEach`. With a non-throwing `exitSpy`, code after `process.exit()` still runs — for "declined overwrite"
   tests, make `exitSpy` throw and assert the rejection.
3. `vi.clearAllMocks()` does NOT reset implementations set via `mockResolvedValue`/`mockRejectedValue`/
   `mockImplementation`. Re-establish every mock's default behavior in `beforeEach` (e.g.,
   `vi.mocked(ensureDependencies).mockResolvedValue(true)`) or rejections leak into later tests.
4. For `program.parseAsync(argv, ...)`, pass user args with `{ from: 'user' }` as the second argument.
   When a command's `.action()` does not `return` its async call (e.g., `slice`), `parseAsync` resolves before
   the action finishes — flush microtasks with `await new Promise((resolve) => setTimeout(resolve, 0))`.
5. To cover progress-callback branches, have the mocked ffmpeg/yt-dlp/slice/split functions invoke their
   callback argument (e.g., `cb?.(50, 1, 2)`) and assert on the captured progress bar mock.

### CLI Integration Tests

For testing with real URLs:

1. Build the CLI: `bun run build`
2. Create test directory: `mkdir -p tmp-dir`
3. Run commands from tmp-dir: `node ../dist/vdo.js dl <url>`
4. Document results in `tmp-dir/summary.md` and `tmp-dir/error.md`

See [docs/CLI_TEST_GUIDE.md](docs/CLI_TEST_GUIDE.md) for detailed testing instructions.

## External Dependencies

- `ffmpeg` - Video processing
- `yt-dlp` - Video downloading

Install: `brew install ffmpeg yt-dlp`

## Adding New Commands

1. Create `src/commands/<name>.ts` with `setup<Name>()` and `<name>Action()`
2. Add interface to `src/types/index.ts`
3. Import and call `setup<Name>(program)` in `src/bin/vdo.ts`
4. Add test file `src/commands/__tests__/<name>.test.ts` with both setup and action tests
5. Document in README.md

## Documentation

- Add JSDoc comments for exported functions and complex types only
- Update CHANGELOG.md for all changes
