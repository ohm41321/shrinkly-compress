"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertTriangle, Archive, ChevronDown, Coffee, Cpu, Download, FileIcon, ImageIcon, Languages, Leaf, LockKeyhole,
  Mail, Menu, Moon, Plus, ShieldCheck, Sparkles, Sun, Trash2, UploadCloud, Video, X, Zap
} from "lucide-react";
import {
  compressGeneric, compressImage, compressVideo, detectVideoResources, downloadAll, downloadBlob,
  releaseVideoEngine, type ResultFile, type VideoResourceProfile
} from "@/lib/compress";

type Status = "ready" | "compressing" | "done" | "error";
type Language = "en" | "th";
type Theme = "dark" | "light";
type QueueItem = {
  id: string;
  file: File;
  status: Status;
  progress: number;
  result?: ResultFile;
  error?: string;
};

const copy = {
  en: {
    tools: "Tools",
    privacy: "Privacy",
    how: "How it works",
    menu: "Menu",
    localBadge: "100% on-device compression",
    heroTop: "Make files smaller.",
    heroAccent: "Keep what matters.",
    heroText: "Compress images, videos, and files for Discord or any platform",
    heroText2: "without uploading a single byte from your device.",
    private: "Private by design",
    browser: "Runs in your browser",
    batch: "Batch ready",
    selectFiles: "Select files",
    fileKinds: "Images, videos, or general files",
    clearAll: "Clear all",
    drop: "Drop your files here",
    browse: "or click to browse from your device",
    support: "Supports JPG, PNG, WebP, MP4, MOV, and general files",
    image: "Image",
    video: "Video",
    file: "File",
    ready: "Ready",
    smaller: "smaller",
    failed: "Failed",
    download: "Download",
    remove: "Remove",
    addFiles: "Add more files",
    target: "Set a target size",
    targetHint: "per file · perfect for platform upload limits",
    resourceMode: "Highest quality · 2-pass",
    resourceTitle: "Video compression uses your device",
    resourceText: "Shrinkly detects this device automatically, keeps at least half of its logical CPU cores free, and processes one video at a time. CPU, memory, and battery usage will increase during two-pass encoding.",
    resourceDetecting: "Detecting available CPU and memory...",
    resourceSingleThread: "Single-thread compatibility mode",
    qualityTitle: "Extreme size reduction",
    qualityText: "This target removes over 90% of the original size. Two-pass encoding analyzes motion first, gives more bitrate to complex scenes, and reduces audio bitrate to preserve the clearest possible picture within the limit.",
    safe: "Your files stay private",
    safeHint: "Processed locally, never sent to a server",
    downloadAll: "Download all",
    downloadFile: "Download file",
    saved: "Saved",
    compressing: "Compressing...",
    start: "Start compressing",
    files: "files",
    oneFile: "file",
    largeWarning: "Large video — processing can take a while. Keep this tab open.",
    loadingEngine: "Loading the compression engine",
    preparingFile: "Preparing the file in memory",
    analyzingVideo: "Pass 1/2 · analyzing motion and scenes",
    encodingVideo: "Pass 2/2 · encoding the final video",
    optimizing: "Optimizing on your device",
    genericError: "Something went wrong",
    featurePrivate: "Truly private",
    featurePrivateText: "Everything runs on your device. We never see, store, or upload your files.",
    featureQuality: "Quality conscious",
    featureQualityText: "Smart settings balance size and clarity to preserve the details that matter.",
    featureBatch: "Built for batches",
    featureBatchText: "Process multiple images and videos together, then download them in one click.",
    donate: "Donate",
    contact: "Contact",
    supportTitle: "Enjoying Shrinkly?",
    supportText: "Help keep this tool free and independent with a small coffee.",
    supportButton: "Buy me a coffee",
    contactTitle: "Contact Me",
    contactText: "Questions, feedback, or just want to say hello?",
    themeLight: "Switch to light theme",
    themeDark: "Switch to dark theme",
    language: "Switch language"
  },
  th: {
    tools: "เครื่องมือ",
    privacy: "ความเป็นส่วนตัว",
    how: "วิธีใช้งาน",
    menu: "เมนู",
    localBadge: "บีบอัดบนเครื่องคุณ 100%",
    heroTop: "ไฟล์เล็กลง",
    heroAccent: "สิ่งสำคัญยังอยู่ครบ",
    heroText: "ลดขนาดรูป วิดีโอ และไฟล์ให้พอดีกับ Discord หรือทุกแพลตฟอร์ม",
    heroText2: "โดยไม่อัปโหลดข้อมูลออกจากอุปกรณ์ของคุณ",
    private: "ออกแบบมาให้เป็นส่วนตัว",
    browser: "ทำงานในเบราว์เซอร์",
    batch: "รองรับหลายไฟล์",
    selectFiles: "เลือกไฟล์",
    fileKinds: "รูปภาพ วิดีโอ หรือไฟล์ทั่วไป",
    clearAll: "ล้างทั้งหมด",
    drop: "ลากไฟล์มาวางที่นี่",
    browse: "หรือคลิกเพื่อเลือกไฟล์จากเครื่อง",
    support: "รองรับ JPG, PNG, WebP, MP4, MOV และไฟล์ทั่วไป",
    image: "รูปภาพ",
    video: "วิดีโอ",
    file: "ไฟล์",
    ready: "พร้อม",
    smaller: "เล็กลง",
    failed: "ไม่สำเร็จ",
    download: "ดาวน์โหลด",
    remove: "ลบ",
    addFiles: "เพิ่มไฟล์",
    target: "กำหนดขนาดเป้าหมาย",
    targetHint: "ต่อไฟล์ · เหมาะกับข้อจำกัดของแพลตฟอร์ม",
    resourceMode: "คุณภาพสูงสุด · 2-pass",
    resourceTitle: "การบีบอัดวิดีโอใช้ทรัพยากรเครื่องของคุณ",
    resourceText: "Shrinkly ตรวจสเปกเครื่องนี้อัตโนมัติ เว้น logical CPU cores ไว้อย่างน้อยครึ่งหนึ่ง และทำทีละวิดีโอ ระหว่างเข้ารหัส 2 รอบจะใช้ CPU, RAM และแบตเตอรี่มากขึ้น",
    resourceDetecting: "กำลังตรวจ CPU และ RAM ที่ใช้งานได้...",
    resourceSingleThread: "โหมดเข้ากันได้แบบ 1 thread",
    qualityTitle: "กำลังลดขนาดอย่างหนัก",
    qualityText: "เป้าหมายนี้ลดจากต้นฉบับมากกว่า 90% ระบบ 2-pass จะวิเคราะห์การเคลื่อนไหวก่อน เพิ่ม bitrate ให้ฉากซับซ้อน และลด bitrate เสียงเพื่อรักษาภาพให้ชัดที่สุดภายในขนาดที่กำหนด",
    safe: "ไฟล์ของคุณปลอดภัย",
    safeHint: "ประมวลผลบนเครื่อง ไม่ผ่านเซิร์ฟเวอร์",
    downloadAll: "ดาวน์โหลดทั้งหมด",
    downloadFile: "ดาวน์โหลดไฟล์",
    saved: "ประหยัด",
    compressing: "กำลังบีบอัด...",
    start: "เริ่มบีบอัด",
    files: "ไฟล์",
    oneFile: "ไฟล์",
    largeWarning: "วิดีโอขนาดใหญ่ อาจใช้เวลาสักครู่ กรุณาเปิดหน้านี้ไว้",
    loadingEngine: "กำลังโหลดระบบบีบอัด",
    preparingFile: "กำลังเตรียมไฟล์ในหน่วยความจำ",
    analyzingVideo: "รอบ 1/2 · กำลังวิเคราะห์การเคลื่อนไหวและฉาก",
    encodingVideo: "รอบ 2/2 · กำลังเข้ารหัสวิดีโอผลลัพธ์",
    optimizing: "กำลังประมวลผลบนอุปกรณ์ของคุณ",
    genericError: "เกิดข้อผิดพลาด",
    featurePrivate: "เป็นส่วนตัวจริง",
    featurePrivateText: "ทุกอย่างประมวลผลบนอุปกรณ์ของคุณ เราไม่เห็น ไม่เก็บ และไม่อัปโหลดไฟล์",
    featureQuality: "รักษาคุณภาพ",
    featureQualityText: "ระบบเลือกค่าที่สมดุลระหว่างขนาดและความคมชัด เพื่อเก็บรายละเอียดที่สำคัญ",
    featureBatch: "จัดการเป็นชุด",
    featureBatchText: "ประมวลผลหลายรูปและหลายวิดีโอพร้อมกัน แล้วดาวน์โหลดทั้งหมดได้ในคลิกเดียว",
    donate: "สนับสนุน",
    contact: "ติดต่อ",
    supportTitle: "ชอบ Shrinkly ใช่ไหม?",
    supportText: "☕ สนับสนุนค่ากาแฟให้ผมได้ที่นี่เลยย ☕",
    supportButton: "สนับสนุนค่ากาแฟ",
    contactTitle: "Contact Me | ติดต่อได้ที่",
    contactText: "คำถาม ข้อเสนอแนะ หรืออยากทักทายกัน",
    themeLight: "เปลี่ยนเป็นธีมสว่าง",
    themeDark: "เปลี่ยนเป็นธีมมืด",
    language: "เปลี่ยนภาษา"
  }
} as const;

const formatSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 ** 2).toFixed(bytes < 10 * 1024 ** 2 ? 1 : 0)} MB`;
};

const kindOf = (file: File) =>
  file.type.startsWith("image/") ? "image" : file.type.startsWith("video/") ? "video" : "file";

let queueIdSequence = 0;

const createQueueId = (file: File) => {
  queueIdSequence += 1;
  const cryptoApi = globalThis.crypto;
  let uniquePart: string;

  if (typeof cryptoApi?.randomUUID === "function") {
    uniquePart = cryptoApi.randomUUID();
  } else if (typeof cryptoApi?.getRandomValues === "function") {
    const values = cryptoApi.getRandomValues(new Uint32Array(2));
    uniquePart = Array.from(values, (value) => value.toString(16).padStart(8, "0")).join("");
  } else {
    uniquePart = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  }

  return `${file.name}-${file.lastModified}-${queueIdSequence}-${uniquePart}`;
};

export default function Compressor() {
  const [items, setItems] = useState<QueueItem[]>([]);
  const [targetMB, setTargetMB] = useState(10);
  const [dragging, setDragging] = useState(false);
  const [working, setWorking] = useState(false);
  const [language, setLanguage] = useState<Language>("en");
  const [theme, setTheme] = useState<Theme>("dark");
  const [videoProfile, setVideoProfile] = useState<VideoResourceProfile | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const t = copy[language];

  useEffect(() => {
    const savedLanguage = localStorage.getItem("shrinkly-language");
    const savedTheme = localStorage.getItem("shrinkly-theme");
    if (savedLanguage === "en" || savedLanguage === "th") setLanguage(savedLanguage);
    if (savedTheme === "dark" || savedTheme === "light") setTheme(savedTheme);
    setVideoProfile(detectVideoResources());
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    localStorage.setItem("shrinkly-theme", theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.lang = language;
    localStorage.setItem("shrinkly-language", language);
  }, [language]);

  const addFiles = useCallback((files: FileList | File[]) => {
    const incoming = Array.from(files).map((file) => ({
      id: createQueueId(file),
      file,
      status: "ready" as Status,
      progress: 0
    }));
    setItems((current) => [...current, ...incoming]);
  }, []);

  const update = (id: string, patch: Partial<QueueItem>) =>
    setItems((current) => current.map((item) => item.id === id ? { ...item, ...patch } : item));

  const run = async () => {
    if (!items.length || working) return;
    setWorking(true);
    const target = targetMB * 1024 * 1024;

    try {
      for (const item of items) {
        if (item.status === "done") continue;
        update(item.id, { status: "compressing", progress: 0, error: undefined });
        try {
          let result: ResultFile;
          if (item.file.size <= target) {
            result = { blob: item.file, name: item.file.name, size: item.file.size };
          } else if (kindOf(item.file) === "image") {
            result = await compressImage(item.file, target);
          } else if (kindOf(item.file) === "video") {
            result = await compressVideo(item.file, target, (progress) => update(item.id, { progress }));
          } else {
            result = await compressGeneric(item.file);
          }
          update(item.id, { status: "done", progress: 1, result });
        } catch (error) {
          update(item.id, {
            status: "error",
            error: error instanceof Error ? error.message : t.genericError
          });
        }
      }
    } finally {
      releaseVideoEngine();
      setWorking(false);
    }
  };

  const completed = items.filter((item) => item.result);
  const saved = completed.reduce(
    (sum, item) => sum + Math.max(0, item.file.size - (item.result?.size || 0)),
    0
  );
  const hasQueue = items.length > 0;
  const hasVideo = items.some((item) => kindOf(item.file) === "video");
  const targetBytes = targetMB * 1024 * 1024;
  const hasExtremeVideoReduction = items.some(
    (item) => kindOf(item.file) === "video" && item.file.size > targetBytes * 10
  );
  const resourceProfileText = videoProfile
    ? language === "th"
      ? `ตรวจพบ ${videoProfile.logicalCores} logical cores${videoProfile.reportedMemoryGB ? ` · RAM ที่รายงาน ${videoProfile.reportedMemoryGB} GB` : ""} · ใช้ ${videoProfile.threads} threads · preset ${videoProfile.preset}`
      : `Detected ${videoProfile.logicalCores} logical cores${videoProfile.reportedMemoryGB ? ` · ${videoProfile.reportedMemoryGB} GB reported RAM` : ""} · using ${videoProfile.threads} threads · ${videoProfile.preset} preset`
    : t.resourceDetecting;

  return (
    <main>
      <nav className="nav">
        <a className="brand" href="#" aria-label="Shrinkly home">
          <span className="brand-mark"><span /></span>
          <span>Shrinkly</span>
        </a>
        <div className="nav-links">
          <a href="#compress">{t.tools}</a>
          <a href="#privacy">{t.privacy}</a>
          <a href="#how">{t.how}</a>
        </div>
        <div className="nav-actions">
          <button
            className="utility-button language-toggle"
            onClick={() => setLanguage(language === "en" ? "th" : "en")}
            aria-label={t.language}
            title={t.language}
          >
            <Languages size={15} />
            <span>{language === "en" ? "EN" : "TH"}</span>
          </button>
          <button
            className="utility-button theme-toggle"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            aria-label={theme === "dark" ? t.themeLight : t.themeDark}
            title={theme === "dark" ? t.themeLight : t.themeDark}
          >
            {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
          </button>
          <a className="github-button" href="https://github.com/ohm41321/shrinkly-compress" target="_blank" rel="noreferrer">
            GitHub <span>↗</span>
          </a>
          <a className="nav-cta donate-nav" href="https://easydonate.app/itsathitz" target="_blank" rel="noreferrer">
            <Coffee size={14} /><span>{t.donate}</span>
          </a>
          <a className="nav-cta contact-nav" href="mailto:athitfkm@gmail.com">
            <Mail size={14} /><span>{t.contact}</span>
          </a>
          <button className="mobile-menu" aria-label={t.menu}><Menu size={20} /></button>
        </div>
      </nav>

      <section className="hero">
        <div className="eyebrow"><Sparkles size={13} /> {t.localBadge}</div>
        <h1>{t.heroTop}<br /><span>{t.heroAccent}</span></h1>
        <p>{t.heroText}<br className="desktop" /> {t.heroText2}</p>
        <div className="trust-row">
          <span><LockKeyhole size={14} /> {t.private}</span>
          <i />
          <span><Zap size={14} /> {t.browser}</span>
          <i />
          <span><Archive size={14} /> {t.batch}</span>
        </div>
      </section>

      <section id="compress" className={`workspace ${hasQueue ? "has-files" : ""}`}>
        <div className="workspace-head">
          <div>
            <span className="step">01</span>
            <div><h2>{t.selectFiles}</h2><p>{t.fileKinds}</p></div>
          </div>
          {hasQueue && (
            <button className="clear" onClick={() => !working && setItems([])}>
              <Trash2 size={14} /> {t.clearAll}
            </button>
          )}
        </div>

        {!hasQueue ? (
          <button
            className={`dropzone ${dragging ? "dragging" : ""}`}
            onClick={() => inputRef.current?.click()}
            onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={(event) => {
              event.preventDefault();
              setDragging(false);
              addFiles(event.dataTransfer.files);
            }}
          >
            <span className="upload-icon"><UploadCloud size={25} /></span>
            <strong>{t.drop}</strong>
            <span>{t.browse}</span>
            <em>{t.support}</em>
          </button>
        ) : (
          <div className="queue">
            {items.map((item) => {
              const kind = kindOf(item.file);
              const Icon = kind === "image" ? ImageIcon : kind === "video" ? Video : FileIcon;
              const kindLabel = kind === "image" ? t.image : kind === "video" ? t.video : t.file;
              const progressLabel =
                kind === "video" && item.progress < 0.03 ? t.loadingEngine :
                kind === "video" && item.progress < 0.08 ? t.preparingFile :
                kind === "video" && item.progress < 0.50 ? t.analyzingVideo :
                kind === "video" ? t.encodingVideo :
                t.optimizing;
              const saving = item.result
                ? Math.max(0, Math.round((1 - item.result.size / item.file.size) * 100))
                : 0;

              return (
                <div className="file-row" key={item.id}>
                  <span className={`file-type ${kind}`}><Icon size={20} /></span>
                  <div className="file-info">
                    <strong title={item.file.name}>{item.file.name}</strong>
                    <span>{formatSize(item.file.size)} · {kindLabel}</span>
                    {item.status === "compressing" && (
                      <div className="progress-wrap">
                        <div className={`progress ${item.progress <= 0.081 ? "warming" : ""}`}>
                          <i style={{ width: `${Math.max(2, item.progress * 100)}%` }} />
                        </div>
                        <span>{progressLabel} · {Math.round(item.progress * 100)}%</span>
                      </div>
                    )}
                    {kind === "video" && item.file.size >= 500 * 1024 * 1024 && item.status === "ready" && (
                      <span className="large-warning">{t.largeWarning}</span>
                    )}
                    {item.error && <span className="error">{item.error}</span>}
                  </div>
                  <div className="file-result">
                    {item.status === "ready" && <span className="status ready">{t.ready}</span>}
                    {item.status === "compressing" && (
                      <span className="status processing">{Math.round(item.progress * 100)}%</span>
                    )}
                    {item.status === "done" && (
                      <>
                        <span className="saved">{saving}% {t.smaller}</span>
                        <strong>{formatSize(item.result!.size)}</strong>
                      </>
                    )}
                    {item.status === "error" && <span className="status failed">{t.failed}</span>}
                  </div>
                  {item.result ? (
                    <button
                      className="icon-button"
                      onClick={() => downloadBlob(item.result!.blob, item.result!.name)}
                      aria-label={t.download}
                    >
                      <Download size={17} />
                    </button>
                  ) : (
                    <button
                      className="icon-button"
                      disabled={working}
                      onClick={() => setItems((list) => list.filter((x) => x.id !== item.id))}
                      aria-label={t.remove}
                    >
                      <X size={17} />
                    </button>
                  )}
                </div>
              );
            })}
            <button
              className="add-more"
              onClick={() => inputRef.current?.click()}
              disabled={working}
            >
              <Plus size={16} /> {t.addFiles}
            </button>
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          multiple
          hidden
          onChange={(event) => event.target.files && addFiles(event.target.files)}
        />

        <div className="controls">
          <div className="target-copy">
            <span className="step">02</span>
            <div><h2>{t.target}</h2><p>{t.targetHint}</p></div>
          </div>
          <div className="size-picker">
            <button className={targetMB === 10 ? "active" : ""} onClick={() => setTargetMB(10)}>
              Discord <b>10 MB</b>
            </button>
            <button className={targetMB === 25 ? "active" : ""} onClick={() => setTargetMB(25)}>
              Email <b>25 MB</b>
            </button>
            <label>
              <input
                type="number"
                min="0.1"
                max="2048"
                step="0.1"
                value={targetMB}
                onChange={(event) => setTargetMB(Math.max(.1, Number(event.target.value)))}
              />
              <span>MB</span>
              <ChevronDown size={14} />
            </label>
          </div>
        </div>

        {hasVideo && (
          <div
            className={`resource-notice ${working ? "active" : ""}`}
            role="note"
            aria-label={t.resourceTitle}
            aria-live="polite"
          >
            <span className="resource-icon"><Cpu size={20} /></span>
            <div>
              <span className="resource-badge"><Leaf size={12} /> {t.resourceMode}</span>
              <strong>{t.resourceTitle}</strong>
              <p>{t.resourceText}</p>
              <span className="resource-profile">
                {videoProfile && !videoProfile.useMultiThread
                  ? `${resourceProfileText} · ${t.resourceSingleThread}`
                  : resourceProfileText}
              </span>
            </div>
          </div>
        )}

        {hasExtremeVideoReduction && (
          <div className="quality-notice" role="alert">
            <AlertTriangle size={18} />
            <div>
              <strong>{t.qualityTitle}</strong>
              <p>{t.qualityText}</p>
            </div>
          </div>
        )}

        <div className="action-row">
          <div className="privacy-note">
            <ShieldCheck size={16} />
            <span><b>{t.safe}</b><br />{t.safeHint}</span>
          </div>
          {completed.length === items.length && items.length > 0 ? (
            <button
              className="primary download-all"
              onClick={() => downloadAll(completed.map((item) => item.result!))}
            >
              <Download size={18} />
              {completed.length > 1 ? t.downloadAll : t.downloadFile}
              <span>{saved > 0 && `${t.saved} ${formatSize(saved)}`}</span>
            </button>
          ) : (
            <button className="primary" disabled={!items.length || working} onClick={run}>
              {working ? (
                <><span className="spinner" /> {t.compressing}</>
              ) : (
                <>
                  <Zap size={18} fill="currentColor" /> {t.start}
                  <span>{items.length ? `${items.length} ${items.length === 1 ? t.oneFile : t.files}` : ""}</span>
                </>
              )}
            </button>
          )}
        </div>
      </section>

      <section id="privacy" className="features">
        <article>
          <span><LockKeyhole size={19} /></span>
          <h3>{t.featurePrivate}</h3>
          <p>{t.featurePrivateText}</p>
        </article>
        <article>
          <span><Sparkles size={19} /></span>
          <h3>{t.featureQuality}</h3>
          <p>{t.featureQualityText}</p>
        </article>
        <article>
          <span><Archive size={19} /></span>
          <h3>{t.featureBatch}</h3>
          <p>{t.featureBatchText}</p>
        </article>
      </section>

      <section id="support" className="support-section">
        <article className="support-card donate-card">
          <span className="support-icon"><Coffee size={24} /></span>
          <div>
            <span className="support-kicker">{t.donate}</span>
            <h3>{t.supportTitle}</h3>
            <p>{t.supportText}</p>
          </div>
          <a href="https://easydonate.app/itsathitz" target="_blank" rel="noreferrer">
            {t.supportButton} <span>↗</span>
          </a>
        </article>
        <article className="support-card contact-card">
          <span className="support-icon"><Mail size={24} /></span>
          <div>
            <span className="support-kicker">{t.contact}</span>
            <h3>{t.contactTitle}</h3>
            <p>{t.contactText}</p>
          </div>
          <a href="mailto:athitfkm@gmail.com">athitfkm@gmail.com</a>
        </article>
      </section>

      <footer id="how">
        <a className="brand" href="#">
          <span className="brand-mark"><span /></span><span>Shrinkly</span>
        </a>
        <p>Small files. Full quality. Zero uploads.</p>
        <span>© 2026 Shrinkly</span>
      </footer>
    </main>
  );
}
