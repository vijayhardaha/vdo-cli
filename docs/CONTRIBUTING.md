# Contributing to vdo

Thank you for your interest in contributing to vdo!

## Getting Started

### Prerequisites

- Node.js ≥ 20
- bun package manager
- ffmpeg: `brew install ffmpeg`
- yt-dlp: `brew install yt-dlp`

### Setup

1. Fork the repository
2. Clone your fork:
   ```bash
   git clone https://github.com/YOUR_USERNAME/vdo-cli.git
   cd vdo-cli
   ```
3. Install dependencies:
   ```bash
   bun install
   ```
4. Link for development:
   ```bash
   bun link
   ```

## Development

### Running the CLI

```bash
bun dev              # Run in development mode
bun run build        # Build for production
```

### Running Tests

```bash
bun run test          # Run all tests
bun run test:watch    # Run tests in watch mode
bun run test:coverage # Run with coverage
```

### Code Quality

```bash
bun run tsc          # TypeScript check
bun run lint         # Lint check
bun run lint:fix     # Auto-fix lint issues
bun run format       # Format code
bun run format:check # Check formatting
```

## Project Structure

```
vdo-cli/
├── src/
│   ├── bin/vdo.ts           # Entry point
│   ├── commands/            # Command implementations
│   │   ├── audio.ts
│   │   ├── compress.ts
│   │   ├── compact.ts
│   │   ├── convert.ts
│   │   ├── download.ts
│   │   ├── slice.ts
│   │   ├── speedup.ts
│   │   └── split.ts
│   ├── utils/               # Utility functions
│   │   ├── dependencies.ts
│   │   ├── ffmpeg.ts
│   │   ├── icons.ts
│   │   ├── log.ts
│   │   ├── progress.ts
│   │   ├── sanitize.ts
│   │   ├── slice.ts
│   │   ├── split.ts
│   │   ├── validations.ts
│   │   └── ytdlp.ts
│   └── types/               # TypeScript types
│       └── index.ts
├── tests/                   # Test files
├── docs/                    # Documentation
└── dist/                    # Build output
```

## Adding New Commands

1. Create the command file in `src/commands/`:

   ```typescript
   // src/commands/newcmd.ts
   import type { Command } from "commander";
   import type { NewCmdOptions } from "../types";
   import { checkDependencies } from "../utils/dependencies";
   import { log } from "../utils/log";

   export async function newCmdAction(input: string, options: NewCmdOptions): Promise<void> {
     // Implementation
   }

   export function setupNewCmd(program: Command): void {
     program
       .command("newcmd <input>")
       .alias("nc")
       .description("Description")
       .option("-o, --output <file>", "Output file name")
       .action(newCmdAction);
   }
   ```

2. Add interface to `src/types/index.ts`:

   ```typescript
   export interface NewCmdOptions {
     output?: string;
     // other options
   }
   ```

3. Register in `src/bin/vdo.ts`:

   ```typescript
   import { setupNewCmd } from "./commands/newcmd";
   setupNewCmd(program);
   ```

4. Add tests in `tests/newcmd.test.ts`

5. Document in README.md

## Commit Guidelines

Use conventional commits:

```
feat(scope): add new feature
fix(scope): fix bug
docs(scope): update documentation
test(scope): add tests
refactor(scope): code refactoring
chore: maintenance
```

Examples:

- `feat(download): add --split option`
- `fix(convert): remove webm format support`
- `docs(readme): update installation instructions`

## Testing

See [CLI Testing Guide](CLI_TEST_GUIDE.md) for detailed testing instructions.

### Quick Test

```bash
# Test a URL
cd tmp-dir
node ../dist/vdo.js dl <url> --format mp4
```

## Pull Request Process

1. Create a feature branch:

   ```bash
   git checkout -b feat/your-feature-name
   ```

2. Make your changes and commit:

   ```bash
   git add .
   git commit -m "feat(scope): description"
   ```

3. Push to your fork:

   ```bash
   git push origin feat/your-feature-name
   ```

4. Open a Pull Request

5. Ensure all checks pass:
   - [ ] TypeScript check
   - [ ] Lint check
   - [ ] Format check
   - [ ] Tests pass
   - [ ] Coverage maintained

## Code Style

- Use TypeScript with strict mode
- Follow existing patterns in the codebase
- Add JSDoc comments for exported functions
- Use meaningful variable names
- Keep functions small and focused

## Reporting Issues

When reporting issues, please include:

- Command used
- Error message
- Video URL (if applicable)
- Node.js version
- Operating system

## Questions?

Feel free to open an issue for questions or discussion.

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
