# AGENTS.md

> **This file serves as the authoritative reference for AI agents (Cursor, Claude Code, etc.) working on the `vdo` codebase.**

## Project Overview

`vdo` is a Node.js CLI for video utilities wrapping `yt-dlp` (download) and `ffmpeg` (convert/compress/speedup/audio).

- **Runtime:** Node.js ≥ 20, ESM only, bun package manager
- **Language:** TypeScript 5, strict mode, `moduleResolution: bundler`
- **Build:** Vite (SSR/Node target) → `dist/vdo.js`
- **Tests:** Vitest with globals enabled

## Commands

| Command            | Alias | Description            | Key Options                          |
| ------------------ | ----- | ---------------------- | ------------------------------------ |
| `download <url>`   | `dl`  | Download from URL      | `-o`, `--format`                     |
| `convert <input>`  | `cvt` | Convert video format   | `--format`, `--preset`, `-o`         |
| `compress <input>` | `cps` | Compress with CRF      | `--crf`, `--preset`, `-o`            |
| `compact <input>`  | `cpt` | Compact to target size | `--target`, `--discord`, `--percent` |
| `slice <input>`    | `slc` | Slice/trim segment     | `--start`, `--end`, `--segments`     |
| `split <input>`    | `spl` | Split into parts       | `--preset`, `--duration`             |
| `speedup <input>`  | `sup` | Change playback speed  | `--rate`, `-o`                       |
| `audio <input>`    | `au`  | Extract audio          | `--format`, `--bitrate`, `-o`        |

## Architecture

```
src/
├── bin/vdo.ts           # Entry point, wires up Commander
├── commands/*.ts        # setup<Name>() + <name>Action()
├── utils/
│   ├── dependencies.ts  # checkDependencies(), runCommand()
│   ├── icons.ts         # Nerd icons (info, success, warning, error)
│   ├── log.ts           # Logging utility (log.succeed, log.fail, etc.)
│   ├── progress.ts      # Progress bar utilities
│   ├── sanitize.ts      # Filename sanitization
│   ├── validations.ts   # Input validation helpers
│   ├── ffmpeg.ts        # FFmpeg wrappers
│   └── ytdlp.ts         # yt-dlp wrappers
└── types/index.ts       # All shared interfaces
```

**Dependency flow:** `commands/` → `utils/` → `types/` (one-way only)

## Development Commands

```bash
bun dev                # Run CLI in development
bun run build          # Build to dist/vdo.js
bun test               # Vitest single run
bun run test:watch     # Vitest watch mode
bun run test:coverage  # Vitest with coverage
bun run tsc            # TypeScript check
bun run lint           # ESLint check
bun run lint:fix       # ESLint auto-fix
bun run format         # Format code
bun run format:check    # Check formatting
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

#### Test Comments (describe, it, expect)

```ts
// describe: {Test suite name}
// it: {Expected behavior}
// expect: {What is being tested}
describe("foo", () => {
  // it: should return bar when given valid input
  it("should return bar", () => {
    // expect: foo('input') returns 'bar'
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
import { runCommand } from "./dependencies.js";
import { log } from "./log.js";
```

### TypeScript

- Strict mode, no `any` without `// eslint-disable` comment
- Use type imports: `import type { Foo } from './types.js'`
- Error handling pattern: `error instanceof Error ? error.message : String(error)`

### Command Actions

Every action must:

1. Call `checkDependencies()` first → `process.exit(1)` if missing
2. Validate all inputs before spawning processes
3. Catch errors → `log.fail('<message>')` → `process.exit(1)`
4. On success → `log.succeed('<Action> completed successfully!')`

## Testing

- Test files in `tests/` matching `*.test.ts`
- Vitest globals available without importing (`describe`, `it`, `expect`, `vi`)
- Mock all external dependencies (no real ffmpeg/yt-dlp processes)
- `vitest.setup.ts` mocks `console.*` globally

## External Dependencies

- `ffmpeg` - Video processing
- `yt-dlp` - Video downloading

Install: `brew install ffmpeg yt-dlp`

## Adding New Commands

1. Create `src/commands/<name>.ts` with `setup<Name>()` and `<name>Action()`
2. Add interface to `src/types/index.ts`
3. Import and call `setup<Name>(program)` in `src/bin/vdo.ts`
4. Add test file `tests/<name>.test.ts`

## Documentation

- Add JSDoc comments for exported functions and complex types only

## Git Workflow

Pre-commit hooks automatically run type check, lint, and format checks.

**Before preparing git.md (after each task):**

1. Run `bun run tsc` - TypeScript check
2. Run `bun run format:check` - Format check
3. Run `bun run lint` - ESLint check
4. Run `bun run test` - Run tests

**After completing a task:**

1. Check unstaged changes: `git status --porcelain`
2. Stage files: `git add <files>`
3. Create `.tmp/git.md` containing the staged files and commit command

Example `.tmp/git.md`:

```bash
git add src/content/index.tsx
git commit -m "feat: add version dropdown selector

- fetch versions from npm registry
- render dropdown with recent versions"
```

## Commit Conventions

**Format:** `<type>(<scope>): <summary>`

**Types:** `feat`, `fix`, `docs`, `test`, `refactor`, `style`, `build`, `chore`

**Rules:** Subject line ≤72 chars, blank line after subject, body wrapped at 100 chars.
