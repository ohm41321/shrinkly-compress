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

async function getFFmpeg(onProgress: (value: number) => void) {
  const { FFmpeg } = await import("@ffmpeg/ffmpeg");
  const { toBlobURL } = await import("@ffmpeg/util");
  if (!ffmpegInstance) {
    ffmpegInstance = new FFmpeg();
    ffmpegInstance.on("progress", ({ progress }) => onProgress(Math.min(0.98, Math.max(0, progress))));
    const base = "https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/umd";
    await ffmpegInstance.load({
      coreURL: await toBlobURL(`${base}/ffmpeg-core.js`, "text/javascript"),
      wasmURL: await toBlobURL(`${base}/ffmpeg-core.wasm`, "application/wasm")
    });
  }
  return ffmpegInstance;
}

function videoDuration(file: File) {
  return new Promise<number>((resolve, reject) => {
    const video = document.createElement("video");
    const url = URL.createObjectURL(file);
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve(video.duration);
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
  const ffmpeg = await getFFmpeg(onProgress);
  const duration = await videoDuration(file);
  const input = `input-${Date.now()}.${file.name.split(".").pop() || "mp4"}`;
  const output = `output-${Date.now()}.mp4`;
  const totalKbps = Math.max(180, Math.floor((targetBytes * 8 * 0.91) / Math.max(duration, 1) / 1000));
  const audioKbps = totalKbps > 500 ? 96 : 64;
  const videoKbps = Math.max(120, totalKbps - audioKbps);

  await ffmpeg.writeFile(input, await fetchFile(file));
  await ffmpeg.exec([
    "-i", input,
    "-c:v", "libx264",
    "-preset", "veryfast",
    "-b:v", `${videoKbps}k`,
    "-maxrate", `${Math.round(videoKbps * 1.15)}k`,
    "-bufsize", `${videoKbps * 2}k`,
    "-c:a", "aac",
    "-b:a", `${audioKbps}k`,
    "-movflags", "+faststart",
    output
  ]);
  const data = await ffmpeg.readFile(output);
  await ffmpeg.deleteFile(input);
  await ffmpeg.deleteFile(output);
  const bytes = data instanceof Uint8Array ? new Uint8Array(data) : new TextEncoder().encode(data);
  const blob = new Blob([bytes], { type: "video/mp4" });
  onProgress(1);
  return { blob, name: `${stem(file.name)}-shrinkly.mp4`, size: blob.size };
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
