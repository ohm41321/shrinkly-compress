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

type VideoEncodingPlan = {
  totalKbps: number;
  videoKbps: number;
  audioKbps: number;
  fps: number;
  maxWidth: number;
  includeAudio: boolean;
};

const even = (value: number) => Math.max(2, Math.floor(value / 2) * 2);

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
    totalKbps < 100 ? 20 :
    totalKbps < 180 ? 24 :
    totalKbps < 300 ? 32 :
    totalKbps < 600 ? 40 :
    totalKbps < 1200 ? 64 :
    totalKbps < 2400 ? 96 :
    128;
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

async function getFFmpeg(onProgress: (value: number) => void) {
  const { FFmpeg } = await import("@ffmpeg/ffmpeg");
  const { toBlobURL } = await import("@ffmpeg/util");
  activeProgress = onProgress;
  lastProgress = 0;

  if (!ffmpegInstance) {
    ffmpegInstance = new FFmpeg();
    ffmpegInstance.on("progress", ({ progress }) => {
      if (Number.isFinite(progress) && progress > 0) {
        reportProgress(0.08 + Math.min(1, progress) * 0.88);
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
        reportProgress(0.08 + Math.min(1, seconds / activeDuration) * 0.88);
      }
    });

    reportProgress(0.01);
    // The single-threaded core keeps peak CPU and WASM memory use predictable.
    // Encoding files sequentially is intentionally handled by the caller.
    const packageName = "@ffmpeg/core";
    const base = `https://cdn.jsdelivr.net/npm/${packageName}@0.12.10/dist/umd`;
    const config = {
      coreURL: await toBlobURL(`${base}/ffmpeg-core.js`, "text/javascript"),
      wasmURL: await toBlobURL(`${base}/ffmpeg-core.wasm`, "application/wasm")
    };

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
  const ffmpeg = await getFFmpeg(onProgress);
  const input = `input-${Date.now()}.${file.name.split(".").pop() || "mp4"}`;
  const output = `output-${Date.now()}.mp4`;
  const plan = getVideoEncodingPlan(metadata, targetBytes);
  const needsScale = metadata.width > plan.maxWidth;
  const videoFilter = [
    needsScale ? `scale='min(${plan.maxWidth},iw)':-2:flags=lanczos` : null,
    `fps=${plan.fps}`
  ].filter(Boolean).join(",");

  reportProgress(0.03);
  try {
    await ffmpeg.writeFile(input, await fetchFile(file));
    reportProgress(0.08);
    const audioArgs = plan.includeAudio
      ? ["-c:a", "aac", "-b:a", `${plan.audioKbps}k`, "-ac", plan.audioKbps <= 40 ? "1" : "2"]
      : ["-an"];
    await ffmpeg.exec([
      "-nostdin",
      "-stats_period", "0.5",
      "-i", input,
      "-c:v", "libx264",
      "-preset", "veryfast",
      "-threads", "1",
      "-vf", videoFilter,
      "-b:v", `${plan.videoKbps}k`,
      "-maxrate", `${Math.round(plan.videoKbps * 1.08)}k`,
      "-bufsize", `${plan.videoKbps * 2}k`,
      "-pix_fmt", "yuv420p",
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
    activeProgress = null;
    activeDuration = 0;
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
