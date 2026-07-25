"use client";

import JSZip from "jszip";

export type ResultFile = {
  blob: Blob;
  name: string;
  size: number;
};

const stem = (name: string) => name.replace(/\.[^.]+$/, "");

function canvasBlob(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("ไม่สามารถแปลงรูปนี้ได้")), type, quality)
  );
}

export async function compressImage(file: File, targetBytes: number): Promise<ResultFile> {
  const bitmap = await createImageBitmap(file);
  let width = bitmap.width;
  let height = bitmap.height;
  let best: Blob | null = null;
  const mime = file.type === "image/png" ? "image/webp" : (file.type === "image/webp" ? "image/webp" : "image/jpeg");

  for (let scalePass = 0; scalePass < 7; scalePass++) {
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(width));
    canvas.height = Math.max(1, Math.round(height));
    const context = canvas.getContext("2d", { alpha: mime === "image/webp" });
    if (!context) throw new Error("เบราว์เซอร์ไม่รองรับ Canvas");
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

    let low = 0.28;
    let high = 0.95;
    for (let i = 0; i < 7; i++) {
      const quality = (low + high) / 2;
      const blob = await canvasBlob(canvas, mime, quality);
      if (!best || Math.abs(blob.size - targetBytes) < Math.abs(best.size - targetBytes)) best = blob;
      if (blob.size > targetBytes) high = quality;
      else low = quality;
    }
    if (best && best.size <= targetBytes) break;
    width *= 0.86;
    height *= 0.86;
  }
  bitmap.close();
  if (!best) throw new Error("ไม่สามารถบีบอัดรูปนี้ได้");
  const ext = mime === "image/webp" ? "webp" : "jpg";
  return { blob: best, name: `${stem(file.name)}-shrinkly.${ext}`, size: best.size };
}

let ffmpegInstance: import("@ffmpeg/ffmpeg").FFmpeg | null = null;
let activeProgress: ((value: number) => void) | null = null;
let activeDuration = 0;
let lastProgress = 0;
let progressOffset = 0.08;
let progressScale = 0.88;

type VideoEncodingPlan = {
  totalKbps: number;
  videoKbps: number;
  audioKbps: number;
  fps: number;
  maxWidth: number;
  includeAudio: boolean;
};

export type VideoResourceProfile = {
  logicalCores: number;
  reportedMemoryGB: number | null;
  threads: number;
  preset: "fast" | "medium" | "slow";
  useMultiThread: boolean;
  tier: "efficient" | "balanced" | "powerful";
};

const even = (value: number) => Math.max(2, Math.floor(value / 2) * 2);

export function detectVideoResources(): VideoResourceProfile {
  if (typeof navigator === "undefined") {
    return {
      logicalCores: 2,
      reportedMemoryGB: null,
      threads: 1,
      preset: "fast",
      useMultiThread: false,
      tier: "efficient"
    };
  }

  const nav = navigator as Navigator & { deviceMemory?: number };
  const logicalCores = Math.max(1, nav.hardwareConcurrency || 2);
  const reportedMemoryGB =
    typeof nav.deviceMemory === "number" && Number.isFinite(nav.deviceMemory)
      ? nav.deviceMemory
      : null;
  const isolated = typeof crossOriginIsolated !== "undefined" && crossOriginIsolated;
  const memoryAllowsThreads = reportedMemoryGB === null || reportedMemoryGB >= 4;
  const useMultiThread = isolated && logicalCores >= 4 && memoryAllowsThreads;
  const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(nav.userAgent);

  // Keep at least half of the logical cores free so the page and operating
  // system remain responsive. Four encoder threads is the practical WASM cap:
  // beyond this, memory pressure and synchronization overhead rise sharply.
  const threads = useMultiThread
    ? Math.min(isMobile ? 2 : 4, Math.max(2, Math.floor(logicalCores / 2)))
    : 1;
  const hasComfortableMemory = reportedMemoryGB === null || reportedMemoryGB >= 8;
  const tier =
    threads >= 4 && logicalCores >= 8 && hasComfortableMemory ? "powerful" :
    threads >= 2 ? "balanced" :
    "efficient";
  const preset =
    tier === "powerful" ? "slow" :
    tier === "balanced" ? "medium" :
    "fast";

  return { logicalCores, reportedMemoryGB, threads, preset, useMultiThread, tier };
}

/**
 * Spend the available bits on fewer, cleaner pixels instead of producing a
 * large, blocky 30 fps frame. This matters most for reductions such as
 * 300 MB -> 10 MB, where the available bitrate can be extremely low.
 */
export function getVideoEncodingPlan(
  metadata: { duration: number; width: number; height: number },
  targetBytes: number
): VideoEncodingPlan {
  const duration = Math.max(metadata.duration, 1);
  // Leave space for MP4 headers and bitrate variation.
  const totalKbps = Math.max(12, Math.floor((targetBytes * 8 * 0.94) / duration / 1000));
  const includeAudio = totalKbps >= 48;
  const audioKbps = !includeAudio ? 0 :
    totalKbps < 180 ? 20 :
    totalKbps < 350 ? 24 :
    totalKbps < 700 ? 32 :
    totalKbps < 1400 ? 48 :
    totalKbps < 2800 ? 64 :
    96;
  const videoKbps = Math.max(12, totalKbps - audioKbps);
  const fps =
    videoKbps < 80 ? 10 :
    videoKbps < 160 ? 12 :
    videoKbps < 280 ? 15 :
    videoKbps < 500 ? 18 :
    videoKbps < 900 ? 24 :
    30;
  const bitsPerPixel =
    videoKbps < 250 ? 0.13 :
    videoKbps < 600 ? 0.11 :
    videoKbps < 1200 ? 0.09 :
    0.075;
  const aspectRatio =
    metadata.width > 0 && metadata.height > 0 ? metadata.width / metadata.height : 16 / 9;
  const pixelBudget = (videoKbps * 1000) / (fps * bitsPerPixel);
  const plannedWidth = Math.sqrt(pixelBudget * aspectRatio);
  const sourceWidth = metadata.width > 0 ? metadata.width : 1920;
  const maxWidth = even(Math.min(sourceWidth, 1920, Math.max(160, plannedWidth)));

  return { totalKbps, videoKbps, audioKbps, fps, maxWidth, includeAudio };
}

function reportProgress(value: number) {
  const nextValue = Math.min(0.98, Math.max(lastProgress, value));
  lastProgress = nextValue;
  activeProgress?.(nextValue);
}

function reportEncodingProgress(value: number) {
  reportProgress(progressOffset + Math.min(1, Math.max(0, value)) * progressScale);
}

function setProgressWindow(offset: number, scale: number) {
  progressOffset = offset;
  progressScale = scale;
}

async function getFFmpeg(
  onProgress: (value: number) => void,
  profile: VideoResourceProfile
) {
  const { FFmpeg } = await import("@ffmpeg/ffmpeg");
  const { toBlobURL } = await import("@ffmpeg/util");
  activeProgress = onProgress;
  lastProgress = 0;

  if (!ffmpegInstance) {
    ffmpegInstance = new FFmpeg();
    ffmpegInstance.on("progress", ({ progress }) => {
      if (Number.isFinite(progress) && progress > 0) {
        reportEncodingProgress(progress);
      }
    });
    ffmpegInstance.on("log", ({ message }) => {
      const timestamp = message.match(/time=\s*(\d{2}):(\d{2}):(\d{2}(?:\.\d+)?)/);
      if (!timestamp || activeDuration <= 0) return;
      const seconds =
        Number(timestamp[1]) * 3600 +
        Number(timestamp[2]) * 60 +
        Number(timestamp[3]);
      if (Number.isFinite(seconds) && seconds > 0) {
        reportEncodingProgress(seconds / activeDuration);
      }
    });

    reportProgress(0.01);
    const packageName = profile.useMultiThread ? "@ffmpeg/core-mt" : "@ffmpeg/core";
    const base = `https://cdn.jsdelivr.net/npm/${packageName}@0.12.10/dist/umd`;
    const config: {
      coreURL: string;
      wasmURL: string;
      workerURL?: string;
    } = {
      coreURL: await toBlobURL(`${base}/ffmpeg-core.js`, "text/javascript"),
      wasmURL: await toBlobURL(`${base}/ffmpeg-core.wasm`, "application/wasm")
    };

    if (profile.useMultiThread) {
      config.workerURL = await toBlobURL(`${base}/ffmpeg-core.worker.js`, "text/javascript");
    }
    await ffmpegInstance.load(config);
  }
  return ffmpegInstance;
}

export function releaseVideoEngine() {
  ffmpegInstance?.terminate();
  ffmpegInstance = null;
  activeProgress = null;
  activeDuration = 0;
  lastProgress = 0;
  progressOffset = 0.08;
  progressScale = 0.88;
}

function videoMetadata(file: File) {
  return new Promise<{ duration: number; width: number; height: number }>((resolve, reject) => {
    const video = document.createElement("video");
    const url = URL.createObjectURL(file);
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve({
        duration: video.duration,
        width: video.videoWidth,
        height: video.videoHeight
      });
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("อ่านข้อมูลวิดีโอไม่สำเร็จ"));
    };
    video.src = url;
  });
}

export async function compressVideo(
  file: File,
  targetBytes: number,
  onProgress: (value: number) => void
): Promise<ResultFile> {
  const { fetchFile } = await import("@ffmpeg/util");
  const metadata = await videoMetadata(file);
  activeDuration = metadata.duration;
  const profile = detectVideoResources();
  const ffmpeg = await getFFmpeg(onProgress, profile);
  const jobId = Date.now();
  const input = `input-${jobId}.${file.name.split(".").pop() || "mp4"}`;
  const output = `output-${jobId}.mp4`;
  const passLog = `passlog-${jobId}`;
  const plan = getVideoEncodingPlan(metadata, targetBytes);
  const needsScale = metadata.width > plan.maxWidth;
  const videoFilter = [
    needsScale ? `scale='min(${plan.maxWidth},iw)':-2:flags=lanczos` : null,
    `fps='min(source_fps,${plan.fps})'`
  ].filter(Boolean).join(",");

  reportProgress(0.03);
  try {
    await ffmpeg.writeFile(input, await fetchFile(file));
    reportProgress(0.08);
    const audioArgs = plan.includeAudio
      ? ["-c:a", "aac", "-b:a", `${plan.audioKbps}k`, "-ac", plan.audioKbps <= 40 ? "1" : "2"]
      : ["-an"];
    const videoArgs = [
      "-c:v", "libx264",
      "-preset", profile.preset,
      "-threads", `${profile.threads}`,
      "-vf", videoFilter,
      "-b:v", `${plan.videoKbps}k`,
      "-pix_fmt", "yuv420p"
    ];

    // Pass 1 only writes analysis statistics. The null muxer avoids keeping a
    // redundant first-pass video in browser memory.
    setProgressWindow(0.08, 0.40);
    await ffmpeg.exec([
      "-nostdin",
      "-stats_period", "0.5",
      "-i", input,
      ...videoArgs,
      "-pass", "1",
      "-passlogfile", passLog,
      "-an",
      "-map_metadata", "-1",
      "-f", "null",
      "-"
    ]);
    reportProgress(0.50);

    setProgressWindow(0.50, 0.48);
    await ffmpeg.exec([
      "-nostdin",
      "-stats_period", "0.5",
      "-i", input,
      ...videoArgs,
      "-pass", "2",
      "-passlogfile", passLog,
      ...audioArgs,
      "-map_metadata", "-1",
      "-movflags", "+faststart",
      output
    ]);
    const data = await ffmpeg.readFile(output);
    const bytes = data instanceof Uint8Array ? new Uint8Array(data) : new TextEncoder().encode(data);
    const blob = new Blob([bytes], { type: "video/mp4" });
    onProgress(1);
    return { blob, name: `${stem(file.name)}-shrinkly.mp4`, size: blob.size };
  } finally {
    await ffmpeg.deleteFile(input).catch(() => undefined);
    await ffmpeg.deleteFile(output).catch(() => undefined);
    await ffmpeg.deleteFile(`${passLog}-0.log`).catch(() => undefined);
    await ffmpeg.deleteFile(`${passLog}-0.log.mbtree`).catch(() => undefined);
    activeProgress = null;
    activeDuration = 0;
    setProgressWindow(0.08, 0.88);
  }
}

export async function compressGeneric(file: File): Promise<ResultFile> {
  const zip = new JSZip();
  zip.file(file.name, file);
  const blob = await zip.generateAsync({ type: "blob", compression: "DEFLATE", compressionOptions: { level: 9 } });
  return { blob, name: `${stem(file.name)}-shrinkly.zip`, size: blob.size };
}

export async function downloadAll(items: ResultFile[]) {
  if (items.length === 1) {
    downloadBlob(items[0].blob, items[0].name);
    return;
  }
  const zip = new JSZip();
  items.forEach((item) => zip.file(item.name, item.blob));
  const blob = await zip.generateAsync({ type: "blob" });
  downloadBlob(blob, "shrinkly-files.zip");
}

export function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
