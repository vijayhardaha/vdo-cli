# vdo - Video Utilities CLI

A powerful Node.js command-line tool for video processing and downloading, built on top of **yt-dlp** and **ffmpeg**.

## Features

- 📥 **Download** videos from YouTube and thousands of other sites
- 🔄 **Convert** videos to different formats
- 🗜️ **Compress** videos with customizable quality
- ⚡ **Speed up** or slow down videos
- 🎵 **Extract** audio from videos
- 🤖 **Auto** mode that automatically detects input type

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
npm install -g vdo
```

Or if you're developing locally:

```bash
git clone https://github.com/yourusername/vdo.git
cd vdo
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
- `--format <format>` - Select format (mp4, mkv, mp3) (default: "mp4")

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
- `--to <format>` - Target format (mp4, mkv, avi, mov, webm, flv) (default: "mp4")
- `--preset <preset>` - Encoding preset (fast, high-quality, custom) (default: "fast")

**Examples:**

```bash
# Convert to MP4 with fast preset
vdo convert input.avi --to mp4

# Convert to MKV with high-quality preset
vdo convert video.mov --to mkv --preset high-quality

# Specify output file
vdo convert source.webm --to mp4 -o output.mp4
```

**Aliases:** `cv`

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

**Aliases:** `cm`

---

#### 4. speedup - Speed up or slow down video

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

**Aliases:** `sp`

---

#### 5. audio - Extract audio from video

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

#### 6. auto - Automatic detection

Automatically detect whether input is a URL or local file and perform appropriate action.

```bash
vdo auto <input|url> [options]
```

**Options:**

- `-o, --output <file>` - Output file name
- `--format <format>` - Format for downloads (mp4, mkv, mp3) (default: "mp4")

**Examples:**

```bash
# Auto-download from URL
vdo auto https://youtube.com/watch?v=example

# Auto-convert local file
vdo auto ./local-video.avi

# With custom output
vdo auto https://youtube.com/watch?v=example -o downloaded.mp4
vdo auto ./video.mov -o converted.mp4
```

**Aliases:** `a`

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
npm install -g vdo
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
sudo npm install -g vdo
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
npm test
```

### Running Tests with Coverage

```bash
npm run test:coverage
```

### Linting

```bash
npm run lint
```

## Project Structure

```
vdo/
├── bin/
│   └── vdo.js              # Main entry point
├── commands/
│   ├── download.js         # Download command
│   ├── convert.js          # Convert command
│   ├── compress.js         # Compress command
│   ├── speedup.js          # Speed adjustment command
│   ├── audio.js            # Audio extraction command
│   └── auto.js             # Auto-detection command
├── utils/
│   ├── dependencies.js     # Dependency checking utilities
│   ├── validations.js      # Input validation utilities
│   ├── ffmpeg.js           # FFmpeg wrapper functions
│   ├── ytdlp.js            # yt-dlp wrapper functions
│   └── progress.js         # Progress bar utilities
├── tests/
│   ├── validations.test.js
│   ├── dependencies.test.js
│   ├── progress.test.js
│   └── commands.test.js
├── package.json
├── jest.config.js
└── README.md
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- [yt-dlp](https://github.com/yt-dlp/yt-dlp) - The ultimate video downloader
- [ffmpeg](https://ffmpeg.org/) - The complete, cross-platform solution for video/audio processing
- [Commander.js](https://github.com/tj/commander.js) - Complete node.js command-line interface
- [cli-progress](https://github.com/npkgz/cli-progress) - Progress bars for CLI applications
- [ora](https://github.com/sindresorhus/ora) - Terminal spinners

## Support

If you encounter any issues or have questions, please file an issue on the GitHub repository.

## Examples Gallery

### Quick Start Examples

```bash
# Download a YouTube video
vdo dl https://youtu.be/dQw4w9WgXcQ

# Convert AVI to MP4
vdo cv movie.avi --to mp4

# Compress a large video file
vdo cm vacation.mp4 --crf 23 --preset slow

# Create a timelapse (speed up)
vdo sp timelapse-source.mp4 --rate 4

# Extract podcast audio
vdo au interview.mp4 --format mp3 --bitrate 192k

# Let vdo decide what to do
vdo a https://vimeo.com/12345678
```

Happy video processing! 🎬🎵
