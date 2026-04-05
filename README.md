# vdo - Video Utilities CLI

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![npm version](https://img.shields.io/npm/v/%40vijayhardaha%2Fvdo-cli)](https://www.npmjs.com/package/@vijayhardaha/vdo-cli)
[![Downloads](https://img.shields.io/npm/dm/%40vijayhardaha%2Fvdo-cli)](https://www.npmjs.com/package/@vijayhardaha/vdo-cli)

> **Video downloader, converter, compressor, and editor** — all in one CLI tool.

A powerful, all-in-one **video processing CLI** built on top of **yt-dlp** and **ffmpeg**. Download videos from YouTube, Instagram, Facebook, and all sites supported by yt-dlp, convert formats, compress files, trim video segments, split for social media, reduce video size, adjust playback speed, or extract audio — all with a single command.

**Why vdo?** Instead of remembering complex ffmpeg syntax or juggling multiple tools, vdo provides intuitive commands with smart defaults, progress tracking, and optimized encoders for common tasks like Discord-ready files or Instagram splits.

## Features

- 📥 **Download** videos from YouTube and thousands of other sites
- 🔄 **Convert** videos to different formats
- 🗜️ **Compress** videos with customizable quality
- 📦 **Compact** videos to target size using two-pass encoding
- ✂️ **Slice** video segments with precision
- 🔀 **Split** videos into multiple parts for social media
- ⚡ **Speed up** or slow down videos
- 🎵 **Extract** audio from videos

## Installation

### Prerequisites

Before installing `vdo`, make sure you have the required dependencies installed:

#### macOS

```bash
brew install ffmpeg yt-dlp
```

#### Ubuntu/Debian

```bash
sudo apt update
sudo apt install ffmpeg yt-dlp
```

#### Windows (with Chocolatey)

```bash
choco install ffmpeg yt-dlp
```

### Install vdo

```bash
npm install -g @vijayhardaha/vdo-cli
```

```bash
pnpm install -g @vijayhardaha/vdo-cli
```

```bash
bun install -g @vijayhardaha/vdo-cli
```

Or if you're developing locally:

```bash
git clone https://github.com/vijayhardaha/vdo-cli.git
cd vdo-cli
npm install
npm link
```

## Usage

```bash
vdo <command> [options]
```

### Commands

#### 1. download - Download video from URL

Download videos from YouTube, Vimeo, and many other sites.

```bash
vdo download <url> [options]
```

**Options:**

- `-o, --output <file>` - Output file name
- `--format <format>` - Select format (mp4, mkv, webm, avi, mov, mp3) (default: "mp4")
- `--convert` - Convert the downloaded file using ffmpeg after download
- `--split <value>` - Split after download (ig|wa|fb|instagram|whatsapp|facebook or seconds)

**Examples:**

```bash
# Download as MP4
vdo download https://youtube.com/watch?v=example

# Download with custom output name
vdo download https://youtube.com/watch?v=example -o myvideo.mp4

# Download as MKV
vdo download https://youtube.com/watch?v=example --format mkv

# Download audio only (MP3)
vdo download https://youtube.com/watch?v=example --format mp3

# Download and convert (remuxes to ensure clean file)
vdo download https://youtube.com/watch?v=example --convert

# Download and split for Instagram (60s parts)
vdo download https://youtube.com/watch?v=example --split ig

# Download and split by custom duration (45 seconds)
vdo download https://youtube.com/watch?v=example --split 45

# Download, convert, and split for WhatsApp (90s parts)
vdo download https://youtube.com/watch?v=example --convert --split wa
```

**Aliases:** `dl`

---

#### 2. convert - Convert local video

Convert video files to different formats.

```bash
vdo convert <input> [options]
```

**Options:**

- `-o, --output <file>` - Output file name
- `--format <format>` - Target format (mp4, mkv, avi, mov, flv) (default: "mp4")
- `--preset <preset>` - Encoding preset (fast, high-quality, custom) (default: "fast")

**Examples:**

```bash
# Convert to MP4 with fast preset
vdo convert input.avi --format mp4

# Convert to MKV with high-quality preset
vdo convert video.mov --format mkv --preset high-quality

# Specify output file
vdo convert source.avi --format mp4 -o output.mp4
```

**Aliases:** `cvt`

---

#### 3. compress - Compress video

Reduce video file size using H.264 encoding with CRF (Constant Rate Factor).

```bash
vdo compress <input> [options]
```

**Options:**

- `-o, --output <file>` - Output file name
- `--crf <value>` - Constant Rate Factor (0-51, lower = better quality) (default: 28)
- `--preset <preset>` - Encoding preset (ultrafast, fast, medium, slow) (default: "medium")

**CRF Guide:**

- 0-17: Visually lossless
- 18-23: High quality
- 24-28: Good quality (recommended)
- 29-35: Lower quality, smaller file
- 36-51: Lowest quality, smallest file

**Examples:**

```bash
# Compress with default settings
vdo compress large_video.mp4

# High quality compression
vdo compress video.mp4 --crf 18 --preset slow

# Fast compression for quick results
vdo compress video.mp4 --crf 23 --preset ultrafast

# Custom output file
vdo compress input.mp4 -o compressed.mp4
```

**Aliases:** `cps`

---

#### 4. compact - Compact video to target size

Compact video files to a specific size using two-pass encoding for optimal quality.

```bash
vdo compact <input> [options]
```

**Options:**

- `-o, --output <file>` - Output file name
- `--target <size>` - Target size (e.g., 25MB, 100MB)
- `--percent <value>` - Reduce to percentage of original size
- `--quality <level>` - Quality preset (low, medium, high, lossless)
- `--preset <preset>` - Encoding preset (ultrafast, fast, medium, slow) (default: "medium")
- `--audio-bitrate <bitrate>` - Audio bitrate (e.g., 128k) (default: "128k")
- `--hevc` - Use HEVC codec for better compression
- `--discord` - Optimize for Discord (24.5MB limit)

**Examples:**

```bash
# Compact to specific size (two-pass encoding)
vdo compact video.mp4 --target 25MB

# Compact for Discord (24.5MB with buffer)
vdo compact video.mp4 --discord

# Use HEVC for better compression
vdo compact video.mp4 --target 20MB --hevc

# Quality preset (single-pass, faster)
vdo compact video.mp4 --quality high

# Reduce to 50% of original size
vdo compact video.mp4 --percent 50
```

**Aliases:** `cpt`

---

#### 5. slice - Slice/trim video segment

Extract a segment from video with precision control.

```bash
vdo slice <input> [options]
```

**Options:**

- `-o, --output <file>` - Output file name
- `-s, --start <time>` - Start time (e.g., 0, 10, 1:30, 00:01:30)
- `-e, --end <time>` - End time (e.g., 10, 1:40, 00:01:40)
- `-d, --duration <time>` - Duration instead of end time
- `--segments <string>` - Multiple segments (e.g., "0-10,30-45,60-90")
- `--fast` - Use stream copy (fast, may not be frame-accurate)
- `--precise` - Re-encode for frame accuracy (slower)
- `--codec <codec>` - Codec for re-encoding (h264, hevc) (default: "h264")

**Examples:**

```bash
# Slice segment (smart default - stream copy)
vdo slice video.mp4 --start 10 --end 30

# Frame-accurate slice (slower, re-encodes)
vdo slice video.mp4 --start 10.5 --end 30.25 --precise

# Use duration instead of end time
vdo slice video.mp4 --start 10 --duration 20

# Multiple segments at once
vdo slice video.mp4 --segments "0-10,30-45,60-90"

# Fast mode (stream copy)
vdo slice video.mp4 --start 0 --end 60 --fast
```

**Aliases:** `slc`

---

#### 6. split - Split video into multiple parts

Split videos into smaller parts based on platform limits.

```bash
vdo split <input> [options]
```

**Options:**

- `-o, --output <file>` - Output directory or base name
- `-p, --preset <platform>` - Platform preset (instagram/ig: 60s, whatsapp/wa: 90s, facebook/fb: 120s)
- `-d, --duration <time>` - Max duration per part (e.g., 60, 1:30, 00:01:30)
- `--fast` - Use stream copy (fast, may not be frame-accurate)
- `--precise` - Re-encode for frame accuracy (default)
- `--codec <codec>` - Codec for re-encoding (h264, hevc) (default: "h264")

**Platform Presets:**

| Preset            | Platform                | Max Duration |
| ----------------- | ----------------------- | ------------ |
| `instagram`, `ig` | Instagram Stories/Reels | 60 seconds   |
| `whatsapp`, `wa`  | WhatsApp Status         | 90 seconds   |
| `facebook`, `fb`  | Facebook Stories        | 120 seconds  |

**Examples:**

```bash
# Split for Instagram stories (60s max per part)
vdo split video.mp4 --preset instagram
vdo split video.mp4 --preset ig

# Split for WhatsApp status (90s max per part)
vdo split video.mp4 --preset whatsapp
vdo split video.mp4 --preset wa

# Split for Facebook (120s max per part)
vdo split video.mp4 --preset facebook
vdo split video.mp4 --preset fb

# Custom duration (45 seconds per part)
vdo split video.mp4 --duration 45

# Fast mode (stream copy)
vdo split video.mp4 --preset instagram --fast
```

**Aliases:** `spl`

**Output:** `input_001.mp4`, `input_002.mp4`, `input_003.mp4`, ...

---

#### 7. speedup - Speed up or slow down video

Adjust video playback speed.

```bash
vdo speedup <input> [options]
```

**Options:**

- `-o, --output <file>` - Output file name
- `--rate <value>` - Speed rate (e.g., 2 for 2x faster, 0.5 for 2x slower) (default: 2)

**Examples:**

```bash
# Speed up 2x (default)
vdo speedup video.mp4

# Speed up 1.5x
vdo speedup video.mp4 --rate 1.5

# Slow down to 0.5x (half speed)
vdo speedup video.mp4 --rate 0.5

# Custom output file
vdo speedup video.mp4 --rate 2 -o fast_video.mp4
```

**Aliases:** `sup`

---

#### 8. audio - Extract audio from video

Extract audio track from video files.

```bash
vdo audio <input> [options]
```

**Options:**

- `-o, --output <file>` - Output file name
- `--format <format>` - Audio format (mp3, wav, aac) (default: "mp3")
- `--bitrate <value>` - Audio bitrate (e.g., 192k, 128k, 320k) (default: "192k")

**Examples:**

```bash
# Extract as MP3 (default)
vdo audio video.mp4

# Extract as WAV
vdo audio video.mp4 --format wav

# Extract as AAC with high bitrate
vdo audio video.mp4 --format aac --bitrate 320k

# Extract with custom output name
vdo audio video.mp4 -o soundtrack.mp3
```

**Aliases:** `au`

---

## Progress Indicators

`vdo` provides real-time progress indicators for all operations:

### Download Progress

```
Downloading [████████████░░░░░░░░] 45% | 45/100 MB
```

### Conversion/Compression Progress

```
Converting [████████████████░░░░] 80% | 80/100 MB
```

### Spinner for Quick Operations

```
⠋ Getting video information...
✔ Video information retrieved
```

## Advanced Usage

### Combining Commands

You can chain commands together for complex workflows:

```bash
# Download and then extract audio
vdo download https://youtube.com/watch?v=example -o video.mp4
vdo audio video.mp4 --format mp3 --bitrate 320k

# Download and compress
vdo download https://youtube.com/watch?v=example
vdo compress download.mp4 --crf 23 --preset slow
```

### Quality Presets

For conversion and compression, choose the right preset for your needs:

- **ultrafast**: Fastest encoding, larger file size
- **fast**: Quick encoding, good balance
- **medium**: Balanced encoding time and quality (default)
- **slow**: Slower encoding, better compression
- **high-quality**: Best quality, largest encoding time

### Format Support

**Video Formats:**

- MP4 (most compatible)
- MKV (feature-rich)
- AVI (legacy)
- MOV (Apple)
- WebM (web)
- FLV (Flash)

**Audio Formats:**

- MP3 (most compatible)
- WAV (lossless)
- AAC (better quality than MP3 at same bitrate)

## Troubleshooting

### Command not found: vdo

Make sure you've installed the package globally and npm's global bin directory is in your PATH:

```bash
npm install -g @vijayhardaha/vdo-cli
echo $PATH  # Make sure it includes npm's global bin directory
```

### Missing dependencies

If you see errors about missing ffmpeg or yt-dlp:

```bash
# macOS
brew install ffmpeg yt-dlp

# Ubuntu/Debian
sudo apt install ffmpeg yt-dlp

# Windows
choco install ffmpeg yt-dlp
```

### Permission denied when installing globally

Use sudo (Linux/Mac) or run as Administrator (Windows):

```bash
sudo npm install -g @vijayhardaha/vdo-cli
```

Or configure npm to use a different global directory:

```bash
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
source ~/.bashrc
```

## Development

### Running Tests

```bash
bun run test
```

### Running Tests with Coverage

```bash
bun run test:coverage
```

### Linting

```bash
bun run lint
```

### Type Checking

```bash
bun run tsc
```

## Project Structure

```
vdo/
├── src/
│   ├── bin/
│   │   ├── vdo.ts              # Main entry point
│   │   └── __tests__/
│   │       └── vdo.test.ts
│   ├── commands/
│   │   ├── download.ts         # Download command
│   │   ├── convert.ts          # Convert command
│   │   ├── compress.ts         # Compress command
│   │   ├── compact.ts          # Compact command
│   │   ├── slice.ts            # Slice command
│   │   ├── speedup.ts          # Speed adjustment command
│   │   ├── split.ts            # Split command
│   │   └── audio.ts            # Audio extraction command
│   ├── utils/
│   │   ├── dependencies.ts     # Dependency checking utilities
│   │   ├── validations.ts      # Input validation utilities
│   │   ├── icons.ts            # Nerd icons
│   │   ├── log.ts              # Logging utility
│   │   ├── ffmpeg.ts           # FFmpeg wrapper functions
│   │   ├── ytdlp.ts            # yt-dlp wrapper functions
│   │   ├── progress.ts          # Progress bar utilities
│   │   ├── compact.ts           # Compact utilities
│   │   ├── slice.ts            # Slice utilities
│   │   ├── split.ts            # Split utilities
│   │   └── prompt.ts           # Prompt utilities
│   └── types/
│       └── index.ts             # TypeScript type definitions
├── package.json
├── vitest.config.ts
└── README.md
```

## Documentation

- [Contributing Guide](docs/CONTRIBUTING.md) - How to contribute to vdo
- [Code of Conduct](docs/CODE_OF_CONDUCT.md) - Community guidelines
- [Testing Guide](docs/CLI_TEST_GUIDE.md) - How to test the CLI with real URLs
- [Changelog](CHANGELOG.md) - Version history and release notes

## Contributing

Contributions are welcome! Please read our [Contributing Guide](docs/CONTRIBUTING.md) before submitting a Pull Request.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [yt-dlp](https://github.com/yt-dlp/yt-dlp) - The ultimate video downloader
- [ffmpeg](https://ffmpeg.org/) - The complete, cross-platform solution for video/audio processing
- [Commander.js](https://github.com/tj/commander.js) - Complete node.js command-line interface
- [cli-progress](https://github.com/npkgz/cli-progress) - Progress bars for CLI applications
- [yoctocolors](https://github.com/yoctocolors/yoctocolors) - Terminal colors

## Support

If you encounter any issues or have questions, please file an issue on the GitHub repository.

## Examples Gallery

### Quick Start Examples

```bash
# Download a YouTube video
vdo dl https://youtu.be/dQw4w9WgXcQ

# Convert AVI to MP4
vdo cvt movie.avi --format mp4

# Compress a large video file
vdo cps vacation.mp4 --crf 23 --preset slow

# Compact video to 25MB for Discord
vdo cpt video.mp4 --discord

# Slice a segment from video
vdo slc video.mp4 --start 10 --end 30

# Split video for Instagram (60s parts)
vdo spl video.mp4 --preset ig

# Create a timelapse (speed up)
vdo sup timelapse-source.mp4 --rate 4

# Extract podcast audio
vdo au interview.mp4 --format mp3 --bitrate 192k
```

Happy video processing! 🎬🎵
