# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
