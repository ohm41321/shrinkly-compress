"use client";

import { useCallback, useRef, useState } from "react";
import {
  Archive, Check, ChevronDown, Download, FileIcon, ImageIcon, LockKeyhole,
  Menu, Plus, ShieldCheck, Sparkles, Trash2, UploadCloud, Video, X, Zap
} from "lucide-react";
import {
  compressGeneric, compressImage, compressVideo, downloadAll, downloadBlob, type ResultFile
} from "@/lib/compress";

type Status = "ready" | "compressing" | "done" | "error";
type QueueItem = {
  id: string;
  file: File;
  status: Status;
  progress: number;
  result?: ResultFile;
  error?: string;
};

const formatSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 ** 2).toFixed(bytes < 10 * 1024 ** 2 ? 1 : 0)} MB`;
};

const kindOf = (file: File) => file.type.startsWith("image/") ? "image" : file.type.startsWith("video/") ? "video" : "file";

export default function Compressor() {
  const [items, setItems] = useState<QueueItem[]>([]);
  const [targetMB, setTargetMB] = useState(10);
  const [dragging, setDragging] = useState(false);
  const [working, setWorking] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = useCallback((files: FileList | File[]) => {
    const incoming = Array.from(files).map((file) => ({
      id: `${file.name}-${file.lastModified}-${crypto.randomUUID()}`,
      file, status: "ready" as Status, progress: 0
    }));
    setItems((current) => [...current, ...incoming]);
  }, []);

  const update = (id: string, patch: Partial<QueueItem>) =>
    setItems((current) => current.map((item) => item.id === id ? { ...item, ...patch } : item));

  const run = async () => {
    if (!items.length || working) return;
    setWorking(true);
    const target = targetMB * 1024 * 1024;
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
        update(item.id, { status: "error", error: error instanceof Error ? error.message : "เกิดข้อผิดพลาด" });
      }
    }
    setWorking(false);
  };

  const completed = items.filter((item) => item.result);
  const saved = completed.reduce((sum, item) => sum + Math.max(0, item.file.size - (item.result?.size || 0)), 0);
  const hasQueue = items.length > 0;

  return (
    <main>
      <nav className="nav">
        <a className="brand" href="#" aria-label="Shrinkly home">
          <span className="brand-mark"><span /></span>
          <span>Shrinkly</span>
        </a>
        <div className="nav-links">
          <a href="#compress">เครื่องมือ</a>
          <a href="#privacy">ความเป็นส่วนตัว</a>
          <a href="#how">วิธีใช้</a>
        </div>
        <a className="github-button" href="https://github.com" target="_blank" rel="noreferrer">GitHub <span>↗</span></a>
        <button className="mobile-menu" aria-label="เมนู"><Menu size={20} /></button>
      </nav>

      <section className="hero">
        <div className="eyebrow"><Sparkles size={13} /> บีบอัดบนเครื่องคุณ 100%</div>
        <h1>เล็กลงแบบ<br /><span>ไม่เสียความรู้สึกเดิม</span></h1>
        <p>ลดขนาดรูป วิดีโอ และไฟล์ให้พอดีกับ Discord หรือทุกแพลตฟอร์ม<br className="desktop" /> โดยไฟล์ไม่เคยถูกอัปโหลดออกจากเครื่องคุณ</p>
        <div className="trust-row">
          <span><LockKeyhole size={14} /> Private by design</span>
          <i />
          <span><Zap size={14} /> ทำงานในเบราว์เซอร์</span>
          <i />
          <span><Archive size={14} /> รองรับหลายไฟล์</span>
        </div>
      </section>

      <section id="compress" className={`workspace ${hasQueue ? "has-files" : ""}`}>
        <div className="workspace-head">
          <div>
            <span className="step">01</span>
            <div><h2>เลือกไฟล์</h2><p>รูปภาพ วิดีโอ หรือไฟล์ทั่วไป</p></div>
          </div>
          {hasQueue && <button className="clear" onClick={() => !working && setItems([])}><Trash2 size={14} /> ล้างทั้งหมด</button>}
        </div>

        {!hasQueue ? (
          <button
            className={`dropzone ${dragging ? "dragging" : ""}`}
            onClick={() => inputRef.current?.click()}
            onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={(event) => { event.preventDefault(); setDragging(false); addFiles(event.dataTransfer.files); }}
          >
            <span className="upload-icon"><UploadCloud size={25} /></span>
            <strong>ลากไฟล์มาวางที่นี่</strong>
            <span>หรือคลิกเพื่อเลือกไฟล์จากเครื่อง</span>
            <em>รองรับ JPG, PNG, WebP, MP4, MOV และไฟล์ทั่วไป</em>
          </button>
        ) : (
          <div className="queue">
            {items.map((item) => {
              const kind = kindOf(item.file);
              const Icon = kind === "image" ? ImageIcon : kind === "video" ? Video : FileIcon;
              const saving = item.result ? Math.max(0, Math.round((1 - item.result.size / item.file.size) * 100)) : 0;
              return (
                <div className="file-row" key={item.id}>
                  <span className={`file-type ${kind}`}><Icon size={20} /></span>
                  <div className="file-info">
                    <strong title={item.file.name}>{item.file.name}</strong>
                    <span>{formatSize(item.file.size)} · {kind === "image" ? "รูปภาพ" : kind === "video" ? "วิดีโอ" : "ไฟล์"}</span>
                    {item.status === "compressing" && <div className="progress"><i style={{ width: `${Math.max(4, item.progress * 100)}%` }} /></div>}
                    {item.error && <span className="error">{item.error}</span>}
                  </div>
                  <div className="file-result">
                    {item.status === "ready" && <span className="status ready">พร้อม</span>}
                    {item.status === "compressing" && <span className="status processing">{Math.round(item.progress * 100)}%</span>}
                    {item.status === "done" && <><span className="saved">เล็กลง {saving}%</span><strong>{formatSize(item.result!.size)}</strong></>}
                    {item.status === "error" && <span className="status failed">ไม่สำเร็จ</span>}
                  </div>
                  {item.result ? (
                    <button className="icon-button" onClick={() => downloadBlob(item.result!.blob, item.result!.name)} aria-label="ดาวน์โหลด"><Download size={17} /></button>
                  ) : (
                    <button className="icon-button" disabled={working} onClick={() => setItems((list) => list.filter((x) => x.id !== item.id))} aria-label="ลบ"><X size={17} /></button>
                  )}
                </div>
              );
            })}
            <button className="add-more" onClick={() => inputRef.current?.click()} disabled={working}><Plus size={16} /> เพิ่มไฟล์</button>
          </div>
        )}
        <input ref={inputRef} type="file" multiple hidden onChange={(event) => event.target.files && addFiles(event.target.files)} />

        <div className="controls">
          <div className="target-copy">
            <span className="step">02</span>
            <div><h2>กำหนดขนาดเป้าหมาย</h2><p>ต่อไฟล์ · เหมาะกับข้อจำกัดของแพลตฟอร์ม</p></div>
          </div>
          <div className="size-picker">
            <button className={targetMB === 10 ? "active" : ""} onClick={() => setTargetMB(10)}>Discord <b>10 MB</b></button>
            <button className={targetMB === 25 ? "active" : ""} onClick={() => setTargetMB(25)}>Email <b>25 MB</b></button>
            <label>
              <input type="number" min="0.1" max="2048" step="0.1" value={targetMB} onChange={(e) => setTargetMB(Math.max(.1, Number(e.target.value)))} />
              <span>MB</span>
              <ChevronDown size={14} />
            </label>
          </div>
        </div>

        <div className="action-row">
          <div className="privacy-note"><ShieldCheck size={16} /><span><b>ไฟล์ของคุณปลอดภัย</b><br />ประมวลผลบนเครื่อง ไม่ผ่านเซิร์ฟเวอร์</span></div>
          {completed.length === items.length && items.length > 0 ? (
            <button className="primary download-all" onClick={() => downloadAll(completed.map((x) => x.result!))}>
              <Download size={18} /> ดาวน์โหลด{completed.length > 1 ? "ทั้งหมด" : "ไฟล์"} <span>{saved > 0 && `ประหยัด ${formatSize(saved)}`}</span>
            </button>
          ) : (
            <button className="primary" disabled={!items.length || working} onClick={run}>
              {working ? <><span className="spinner" /> กำลังบีบอัด...</> : <><Zap size={18} fill="currentColor" /> เริ่มบีบอัด <span>{items.length ? `${items.length} ไฟล์` : ""}</span></>}
            </button>
          )}
        </div>
      </section>

      <section id="privacy" className="features">
        <article><span><LockKeyhole size={19} /></span><h3>เป็นส่วนตัวจริง</h3><p>ไฟล์ทั้งหมดประมวลผลบนอุปกรณ์ของคุณ เราไม่เห็น ไม่เก็บ และไม่อัปโหลด</p></article>
        <article><span><Sparkles size={19} /></span><h3>รักษาคุณภาพ</h3><p>ระบบเลือกค่าที่สมดุลที่สุด เพื่อให้ไฟล์เล็กลงโดยยังคงความคมชัดที่มองเห็น</p></article>
        <article><span><Archive size={19} /></span><h3>จัดการเป็นชุด</h3><p>เลือกหลายรูปและหลายวิดีโอพร้อมกัน แล้วดาวน์โหลดทั้งหมดเป็นไฟล์เดียว</p></article>
      </section>

      <footer id="how">
        <a className="brand" href="#"><span className="brand-mark"><span /></span><span>Shrinkly</span></a>
        <p>Small files. Full quality. Zero uploads.</p>
        <span>© 2026 Shrinkly</span>
      </footer>
    </main>
  );
}
