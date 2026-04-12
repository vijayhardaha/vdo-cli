# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.4] - 2026-04-12

### Added

- **Cookie Authentication for Downloads**: Added `--cookies <browser>` option to download command
  - Passes cookies to yt-dlp via `--cookies-from-browser` flag
  - Supports browsers: chrome, firefox, edge, brave, etc.
  - Enables downloading from sites requiring authentication

### Changed

- **JSDoc Improvements**: Enhanced JSDoc comments across utility files
  - Added missing @throws declarations
  - Fixed @param descriptions to be more descriptive
  - Fixed tag group ordering and type annotations
  - Improved consistency in documentation

- **Config Files**: Updated ESLint configuration for JSDoc header blocks
  - Added eslint-disable/enable comments around header decoration blocks
  - Removed trailing dots from === decoration lines

### Dependencies

- Updated all npm dependencies to latest versions
- Added eslint-plugin-jsdoc for improved JSDoc linting

## [1.0.3] - 2026-04-10

### Added

- **Progress Callback Utility**: Created `createProgressCallback()` to reduce boilerplate in command actions
  - Centralizes progress bar update and render logic
  - Used across compact, compress, convert, speedup, and download commands

- **Video Duration Detection**: Added `getVideoDuration()` utility using ffprobe
  - Replaces hardcoded `totalTime=0` with actual video duration
  - Enables accurate percentage-based progress tracking for encoding operations

### Changed

- **yt-dlp Download Options**: Improved download quality and format handling
  - Added `--audio-quality 0` for mp3 downloads
  - Added `-S vcodec:h264,lang,quality,res,fps,hdr:12,acodec:aac` for video downloads
  - Added `--merge-output-format` parameter for format compatibility
  - Simplified format selection logic

- **Progress Reporting**: Added `progressBar.render()` calls after updates
  - Ensures consistent progress bar display in slice, split, audio, and download commands

- **Progress Callback Signature**: Updated ffmpeg progress callbacks to handle stdout/stderr streams
  - Changed from `(line: string)` to `(data: string, type: 'stdout' | 'stderr')`

### Testing

- Added tests for `createProgressCallback()` function
- Added output resolver mocks to command tests
- Updated compact tests to expect ffprobe call for duration detection

## [1.0.2] - 2026-04-06

### Added

- **Output Resolution Utility**: Created centralized `resolveOutputFile()` utility for consistent output path generation
  - Handles format extension matching (appends if different, keeps if same)
  - Generates default filenames with configurable suffixes
  - Preserves input file extensions when no format specified
  - Comprehensive test suite with 11 test cases covering edge cases

- **Split Output Helper**: Added `generateSplitOutputPaths()` helper for split command
  - Generates sequential output paths for split operations
  - Preserves input file extensions in generated paths

### Changed

- **Command Refactoring**: Migrated multiple commands to use `resolveOutputFile()` utility
  - `convert`: Removed duplicate output logic, now uses centralized utility
  - `compress`: Simplified output path generation
  - `compact`: Simplified output path generation with HEVC support
  - `slice`: Simplified output path generation with descriptive suffixes
  - `speedup`: Simplified output path generation with rate-based suffixes
  - `split`: Updated to preserve input extensions in generated paths

- **Download Extension Logic**: Improved output extension matching in download command
  - Fixed extension comparison to properly handle format matching
  - Uses `extname` for consistent extension checking
  - Simplified conditional logic for output path generation

### Fixed

- **Extension Matching**: Corrected output extension matching logic in download command
  - Properly handles cases where output extension differs from requested format
  - Ensures correct format extension is appended when needed

### Testing

- Added comprehensive tests for `resolveOutputFile()` utility (11 test cases)
- Added tests for convert command format extension matching scenarios
- Added tests for compact, compress, and speedup commands
- Improved test coverage for output path resolution edge cases

## [1.0.1] - 2026-04-05

### Added

- **Overwrite Prompts**: Added file overwrite confirmation prompts to all commands
  - Prompts user before overwriting existing files
  - Applied to slice and split commands

- **Progress Bars**: Added progress indicators for better UX
  - Audio extraction progress bar
  - Slice and split progress bars

- **Dynamic Install Commands**: Show OS-specific install instructions for missing dependencies
  - macOS: `brew install`
  - Linux: `sudo apt install`
  - Windows: `winget install`
  - Fallback: manual install message

### Changed

- **Dependency Management**: Added `ensureDependencies()` utility for centralized dependency checks
  - Used across all command actions
  - Improved error messaging

- **Import Paths**: Migrated all internal imports to use `@` alias
  - Cleaner, more maintainable imports
  - Removed `.js` extensions from imports

- **Overwrite Handling**: Moved overwrite check to command level for slice and split

### Fixed

- **Piped Input**: Fixed handling of piped input in `promptOverwrite`
- **FFmpeg Overwrite**: Added `-y` flag to ffmpeg commands for automatic file overwrite
- **Progress Bars**: Fixed missing progress bar start calls in slice and split commands

### Documentation

- Updated project structure documentation
- Fixed test command in documentation
- Updated `ensureDependencies()` documentation

### Testing

- Improved test coverage for slice, compact, split, download commands
- Refactored tests to follow AGENTS.md conventions
- Split command tests into separate files per command
- Moved tests to proper locations:
  - `bin/` tests to `src/bin/__tests__/`
  - `utils/` tests to `src/utils/__tests__/`
- Fixed test expectations and comments

## [1.0.0] - 2026-04-05

### Added

- **Download Command**: Download videos from YouTube, Instagram, Facebook, and 1000+ sites
  - `--format` option for selecting output format (mp4, mkv, webm, avi, mov, mp3)
  - `--output` option for custom output filename
  - `--convert` option for post-download conversion
  - `--split` option for post-download splitting with presets (ig, wa, fb) or durations

- **Convert Command**: Convert local videos to different formats
  - `--format` option (mp4, mkv, avi, mov, flv)
  - `--preset` option for encoding quality
  - `--output` option for custom output

- **Compress Command**: Compress videos using H.264 encoding with CRF
  - `--crf` option for quality control (0-51)
  - `--preset` option for encoding speed

- **Compact Command**: Compact videos to target size using two-pass encoding
  - `--target` option for specific size (e.g., 25MB)
  - `--discord` option for Discord-optimized output
  - `--hevc` option for HEVC codec
  - `--percent` option for percentage-based reduction
  - `--quality` option for quality presets

- **Slice Command**: Extract video segments with precision
  - `--start` and `--end` options for segment boundaries
  - `--duration` option as alternative to `--end`
  - `--segments` option for multiple segments
  - `--fast` option for stream copy mode
  - `--precise` option for frame-accurate re-encoding

- **Split Command**: Split videos into multiple parts
  - `--preset` option with platform presets (instagram, whatsapp, facebook)
  - `--duration` option for custom part length
  - `--fast` and `--precise` options for encoding mode

- **Speedup Command**: Adjust video playback speed
  - `--rate` option for speed multiplier (0.5-4x)
  - `--output` option for custom output

- **Audio Command**: Extract audio from videos
  - `--format` option (mp3, wav, aac)
  - `--bitrate` option for quality control

### Changed

- Updated command aliases for consistency:
  - `convert`: cv → cvt
  - `compress`: cm → cps
  - `compact`: cp → cpt
  - `slice`: sl → slc
  - `speedup`: sp → sup
  - `split`: spl (new)

- Improved CLI description with more context
- Added SEO-friendly keywords in documentation

### Fixed

- Fixed `-o myvid --format mkv` bug (was using source format instead of requested format)
- Fixed convert `--format` option not working (was using wrong option key)
- Fixed split alias `sp` conflict with speedup

### Removed

- `is-unicode-supported` dependency (simplified icons)

### Documentation

- Added comprehensive README.md
- Added CLI_TEST_GUIDE.md for testing instructions
- Added CONTRIBUTING.md for development guidelines
- Added CODE_OF_CONDUCT.md
- Updated AGENTS.md with all commands and aliases

## [0.0.0] - Initial Release

- Initial project setup
- Basic download and convert functionality
