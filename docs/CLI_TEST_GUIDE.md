# CLI Testing Guide

This guide explains how to test the `vdo` CLI tool with real URLs.

## Prerequisites

- Node.js ≥ 20
- ffmpeg installed (`brew install ffmpeg`)
- yt-dlp installed (`brew install yt-dlp`)
- bun package manager

## Setup

### 1. Build the CLI

```bash
bun run build
```

### 2. Create Test Directory

```bash
mkdir -p tmp-dir
cd tmp-dir
```

## Testing Download Command

### Test URL

Use a short video for faster testing. Example:

```
https://www.youtube.com/watch?v=3-wSEehDBVk
```

Or an Instagram URL:

```
https://www.instagram.com/p/DWoswKaE3-k/
```

### Test Categories

#### 1. Basic Downloads (6 formats)

```bash
# MP4 (default)
node ../dist/vdo.js dl <url>

# With specific format
node ../dist/vdo.js dl <url> --format mp4
node ../dist/vdo.js dl <url> --format mkv
node ../dist/vdo.js dl <url> --format webm
node ../dist/vdo.js dl <url> --format avi
node ../dist/vdo.js dl <url> --format mov
```

#### 2. With --convert

```bash
node ../dist/vdo.js dl <url> --convert
node ../dist/vdo.js dl <url> --convert --format mp4
node ../dist/vdo.js dl <url> --convert --format mkv
node ../dist/vdo.js dl <url> --convert --format avi
node ../dist/vdo.js dl <url> --convert --format mov
```

#### 3. With --split (Presets)

```bash
# Instagram (60s)
node ../dist/vdo.js dl <url> --split ig
node ../dist/vdo.js dl <url> --split instagram

# WhatsApp (90s)
node ../dist/vdo.js dl <url> --split wa
node ../dist/vdo.js dl <url> --split whatsapp

# Facebook (120s)
node ../dist/vdo.js dl <url> --split fb
node ../dist/vdo.js dl <url> --split facebook
```

#### 4. With --split (Durations)

```bash
node ../dist/vdo.js dl <url> --split 45
node ../dist/vdo.js dl <url> --split 60
node ../dist/vdo.js dl <url> --split 120
```

#### 5. With -o Output

```bash
node ../dist/vdo.js dl <url> -o myvid --format mp4
node ../dist/vdo.js dl <url> -o myvid --format mkv
node ../dist/vdo.js dl <url> -o myvid --format avi
node ../dist/vdo.js dl <url> -o myvid --format mov
```

#### 6. Combined Options

```bash
# Convert + custom output
node ../dist/vdo.js dl <url> --convert -o myvid
node ../dist/vdo.js dl <url> --convert -o myvid --format mkv

# Convert + split
node ../dist/vdo.js dl <url> --convert --split ig
node ../dist/vdo.js dl <url> --convert -o myvid --split wa
node ../dist/vdo.js dl <url> --convert --split 60
```

## Testing Other Commands

### Convert Command

```bash
node ../dist/vdo.js convert input.mp4 --format mkv
node ../dist/vdo.js cvt input.mp4 --format avi --preset slow
```

### Compress Command

```bash
node ../dist/vdo.js compress input.mp4 --crf 23
node ../dist/vdo.js cps input.mp4 --crf 18 --preset slow
```

### Compact Command

```bash
node ../dist/vdo.js compact input.mp4 --target 25MB
node ../dist/vdo.js cpt input.mp4 --discord
node ../dist/vdo.js cpt input.mp4 --target 20MB --hevc
```

### Slice Command

```bash
node ../dist/vdo.js slice input.mp4 --start 10 --end 30
node ../dist/vdo.js slc input.mp4 --start 10 --duration 20
node ../dist/vdo.js slc input.mp4 --segments "0-10,30-45"
```

### Split Command

```bash
node ../dist/vdo.js split input.mp4 --preset instagram
node ../dist/vdo.js spl input.mp4 --duration 60
```

### Speedup Command

```bash
node ../dist/vdo.js speedup input.mp4 --rate 2
node ../dist/vdo.js sup input.mp4 --rate 0.5
```

### Audio Command

```bash
node ../dist/vdo.js audio input.mp4
node ../dist/vdo.js au input.mp4 --format mp3 --bitrate 320k
```

## Generating Test Documentation

### Summary Document

Create `tmp-dir/summary.md`:

```markdown
# Test Summary

**Date:** YYYY-MM-DD
**URL:** <test-url>
**Total Tests:** N

| #   | Command | Output | Status |
| --- | ------- | ------ | ------ |
| 1   | ...     | ...    | ✅     |

## Known Issues

...

## Summary

...
```

### Error Document

Create `tmp-dir/error.md`:

```markdown
# Error Documentation

**Date:** YYYY-MM-DD

## Error 1

### Message

...

### Cause

...

### Solution

...

## Known Working Combinations

...
```

## Cleanup

After testing, clean up the test directory:

```bash
rm -rf tmp-dir/*
```

## CI/Testing Checklist

Before committing, ensure:

- [ ] `bun run tsc` passes
- [ ] `bun run format:check` passes
- [ ] `bun run lint` passes
- [ ] `bun run test` passes
- [ ] All new functionality tested with real URLs

## Troubleshooting

### Instagram Rate Limiting

Instagram may rate limit downloads. Wait a few seconds and retry:

```bash
sleep 10
node ../dist/vdo.js dl <url>
```

### WebM Conversion

WebM requires VP9 video codec. Use `--convert` with MP4/MKV/AVI/MOV instead.

### Video Too Long

Use shorter test videos for faster testing. Videos under 2 minutes are ideal.
