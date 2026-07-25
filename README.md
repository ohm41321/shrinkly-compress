<div align="center">

# Shrinkly

### Smaller files. Smarter quality. Zero uploads.

Privacy-first image, video, and file compression that runs entirely in your browser.

[![Next.js 15](https://img.shields.io/badge/Next.js-15-000000?logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![React 19](https://img.shields.io/badge/React-19-149ECA?logo=react&logoColor=white)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
![On-device processing](https://img.shields.io/badge/processing-on--device-9ACD32)
![No uploads](https://img.shields.io/badge/uploads-none-2E7D32)

[English](README.md) · [ภาษาไทย](README.th.md)

[Highlights](#highlights) · [How it works](#how-it-works) · [Quick start](#quick-start)

</div>

---

## Overview

Shrinkly prepares files for platforms with strict upload limits—such as
Discord's 10 MB limit—without sending the selected files to an application
server. It combines target-aware compression with automatic device-resource
detection to preserve as much visible detail as practical while keeping the
browser responsive.

> [!IMPORTANT]
> Selected files remain on your device. Video compression downloads the
> FFmpeg WebAssembly runtime from jsDelivr when first needed, but the video
> itself is never sent to the CDN.

## Highlights

| | Capability | What it provides |
| --- | --- | --- |
| 🔒 | **Private by design** | Images, videos, and files are processed locally in the browser. |
| 🎯 | **Exact size targets** | Presets for Discord (10 MB), email (25 MB), and custom targets. |
| ✨ | **Quality-first video** | Two-pass H.264 encoding allocates more bitrate to complex scenes. |
| ⚙️ | **Device-aware performance** | CPU, reported memory, mobile status, and WebAssembly capabilities determine the encoding profile. |
| 🧠 | **Adaptive media settings** | Resolution, frame rate, video bitrate, and audio budget adapt to the target. |
| 📦 | **Batch workflow** | Queue multiple files, track each result, and download individually or as one ZIP. |
| 🌗 | **Polished interface** | Responsive English/Thai UI with remembered language and theme preferences. |

## How it works

```text
Select files → Choose a target → Process on device → Download results
```

Shrinkly chooses a strategy based on the file type:

| File type | Input examples | Compression strategy | Output |
| --- | --- | --- | --- |
| Images | JPG, PNG, WebP | Canvas-based quality search with progressive resizing when required | JPEG or WebP |
| Videos | MP4, MOV, browser-readable media | Adaptive two-pass H.264/AAC encoding | MP4 |
| Other files | Documents, archives, miscellaneous files | DEFLATE compression with JSZip | ZIP |

### Quality-first video pipeline

1. Read the duration and dimensions from the selected video.
2. Calculate the available video and audio bitrate from the requested size.
3. Reduce audio to 20–96 kbps when necessary so more of the budget remains
   available for the picture.
4. Select an appropriate resolution and frame-rate ceiling based on the
   available bits per pixel.
5. Run a first pass to analyze motion and scene complexity.
6. Run a second pass to distribute bitrate where it produces the most visible
   benefit.

The encoder never raises the frame rate above the source. Metadata is removed,
the result uses broadly compatible H.264/AAC, and the MP4 is optimized for
progressive playback.

### Automatic resource profile

The browser exposes only approximate hardware information. Shrinkly uses what
is available and falls back safely when a signal is unavailable.

| Detected environment | Threads | Preset | Behavior |
| --- | ---: | --- | --- |
| Compatibility mode or limited memory | 1 | `fast` | Lowest peak load and broadest support |
| Balanced desktop | 2–3 | `medium` | Better compression efficiency without occupying every core |
| Powerful desktop | 4 | `slow` | Highest quality profile |
| Mobile device | Up to 2 | `medium` or `fast` | Limits sustained CPU and memory pressure |

At least half of the reported logical CPU cores remain free. Videos are
processed sequentially, temporary pass data is removed, and the FFmpeg engine
is released from memory after the batch finishes.

> [!NOTE]
> Multi-threaded WebAssembly requires cross-origin isolation. `vercel.json`
> already supplies the required COOP/COEP headers for Vercel. Other hosting
> providers must configure equivalent headers; otherwise Shrinkly
> automatically uses the single-thread compatibility profile.

## Privacy model

- Selected files are not uploaded to a Shrinkly application server.
- Image processing uses `createImageBitmap` and the browser Canvas API.
- Video processing uses FFmpeg WebAssembly inside the browser.
- General-file compression uses JSZip in the browser.
- Temporary video files and two-pass logs are removed after processing.
- The in-memory FFmpeg instance is terminated when the queue finishes.

The first video operation requires an internet connection to download the
FFmpeg runtime. Subsequent loading may be served from the browser cache.

## Quick start

### Requirements

- Node.js 20 or newer
- npm
- A modern browser

### Run locally

```bash
git clone https://github.com/ohm41321/shrinkly-compress.git
cd shrinkly-compress
npm ci
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Production build

```bash
npm run build
```

Next.js exports the static application to `out/`. The post-build script copies
the same output to `dist/`.

## Deploy

### Vercel

1. Import [`ohm41321/shrinkly-compress`](https://github.com/ohm41321/shrinkly-compress)
   into Vercel.
2. Keep the detected framework set to **Next.js**.
3. Deploy.

No database, secret, or environment variable is required. The committed
`vercel.json` configures the headers needed for multi-threaded FFmpeg
WebAssembly.

### Other static hosts

Deploy the contents of `out/` or `dist/` and configure these response headers:

```text
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: credentialless
```

Without those headers the application remains functional, but video encoding
uses the single-thread core.

## Project structure

```text
.
├── app/
│   ├── globals.css          # Global styles, themes, and responsive layout
│   ├── layout.tsx           # Root layout and metadata
│   └── page.tsx             # Application entry page
├── components/
│   └── Compressor.tsx       # Upload queue and compression interface
├── lib/
│   └── compress.ts          # Image, adaptive video, ZIP, and download logic
├── scripts/
│   └── export-dist.mjs      # Copies the static export to dist/
├── next.config.mjs
├── package.json
├── tsconfig.json
└── vercel.json
```

## Technology

- [Next.js 15](https://nextjs.org/) and [React 19](https://react.dev/)
- [TypeScript](https://www.typescriptlang.org/)
- [FFmpeg WebAssembly](https://ffmpegwasm.netlify.app/)
- [JSZip](https://stuk.github.io/jszip/)
- [Lucide React](https://lucide.dev/)
- Browser Canvas and Media APIs

## Limitations

- A reduction such as 300 MB → 10 MB removes roughly 97% of the original file
  size. Two-pass encoding improves allocation, but it cannot retain all
  original detail.
- Long or high-motion videos may require lower resolution, frame rate, or
  bitrate to remain under the target.
- Very large videos are constrained by browser and WebAssembly memory. A
  native encoder is more suitable for frequent workloads around 1 GB or more.
- Already-compressed files such as JPEG, MP4, ZIP, and PDF may not become
  smaller when placed in a ZIP archive.
- Container overhead and codec behavior can make the final size differ
  slightly from the requested target.

## Support

- [Support the project via EasyDonate](https://easydonate.app/itsathitz)
- [Email](mailto:athitfkm@gmail.com)
- [GitHub repository](https://github.com/ohm41321/shrinkly-compress)

## License

This repository does not currently include a license. No permission to use,
modify, or redistribute the source is granted until a license is added.
