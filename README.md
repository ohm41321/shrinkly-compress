# Shrinkly

> Small files. Full quality. Zero uploads.

Shrinkly is a privacy-first web app for compressing images, videos, and general
files directly in the browser. It supports batch processing and custom size
targets, making it easy to prepare files for services with upload limits such
as Discord.

**Languages:** [English](#english) · [ภาษาไทย](#ภาษาไทย)

---

## English

### About

Shrinkly reduces file sizes without sending personal files to an application
server. Images are processed with the browser Canvas API, videos are transcoded
with FFmpeg WebAssembly, and general files are packed into ZIP archives.

The interface is designed to be clean, responsive, and easy to use on both
desktop and mobile devices.

### Features

- Drag and drop or select multiple files at once
- Batch compression for images, videos, and general files
- Ready-made targets for Discord (10 MB) and email (25 MB)
- Custom target size in megabytes
- Individual progress and result status
- Download each result separately or download everything as one ZIP
- English and Thai interface with a remembered language preference
- Dark and light themes with dark mode enabled by default
- Responsive user interface inspired by Vercel and ChatGPT
- Local browser processing for better privacy
- Resource-saving FFmpeg limited to one CPU thread and one video at a time
- Adaptive video resolution and frame rate for cleaner extreme reductions
- Static Next.js export suitable for Vercel

### Supported files

| Type | Examples | Processing |
| --- | --- | --- |
| Images | JPG, PNG, WebP | Quality search, WebP/JPEG conversion, and proportional resizing when required |
| Videos | MP4, MOV and browser-readable formats | H.264/AAC transcoding with a bitrate calculated from the target size |
| Other files | Documents, archives, and general files | DEFLATE compression inside a ZIP archive |

### Privacy

Your selected files remain on your device. They are read and processed by the
browser and are not uploaded to a Shrinkly server.

Video compression downloads the FFmpeg WebAssembly runtime from jsDelivr when
it is first needed. Only the FFmpeg program files are downloaded; your video is
not sent to the CDN.

### Important limitations

- “No quality loss” should be understood as preserving the best practical
  visual quality for the requested size. Re-encoding an image or video to a
  substantially smaller target cannot be mathematically lossless.
- A very small target may require lower image resolution, frame rate, or video
  bitrate.
- Video compression can take significant time and memory because FFmpeg runs
  on the user's device. The video engine is released from memory when a batch
  finishes.
- Very large videos (around 1 GB or more) are constrained by browser and
  WebAssembly memory. A native or dedicated server-side encoder remains more
  suitable for frequent large-video workloads.
- Files that are already compressed, such as ZIP, JPEG, MP4, or PDF files, may
  not become smaller when packed as ZIP.
- A result may differ slightly from the requested size because media containers
  and codecs add overhead.
- An internet connection is required the first time the FFmpeg runtime is
  loaded for video processing.

### Tech stack

- Next.js 15
- React 19
- TypeScript
- FFmpeg WebAssembly
- JSZip
- Lucide React
- Browser Canvas API

### Local development

Requirements:

- Node.js 20 or newer
- npm

Install dependencies and start the development server:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Create a production build:

```bash
npm run build
```

Next.js exports the static site to `out/`. The post-build script also copies
that exact output to `dist/`.

### Deploy to Vercel

1. Push this project to a GitHub repository.
2. Open the Vercel dashboard and select **Add New → Project**.
3. Import the GitHub repository.
4. Keep the detected framework as **Next.js**.
5. Deploy the project.

No database, API key, or environment variable is required.

You can also deploy with the Vercel CLI:

```bash
npm install -g vercel
vercel
```

### Support and contact

- [Donate via EasyDonate](https://easydonate.app/itsathitz)
- Email: [athitfkm@gmail.com](mailto:athitfkm@gmail.com)
- GitHub: [ohm41321/shrinkly-compress](https://github.com/ohm41321/shrinkly-compress)

### Project structure

```text
.
├── app/
│   ├── globals.css          # Global styles and responsive UI
│   ├── layout.tsx           # Root layout and metadata
│   └── page.tsx             # Main page
├── components/
│   └── Compressor.tsx       # Upload queue and compression interface
├── lib/
│   └── compress.ts          # Image, video, ZIP, and download logic
├── scripts/
│   └── export-dist.mjs      # Copies the static export to dist/
├── next.config.mjs
├── package.json
├── tsconfig.json
└── vercel.json
```

### License

No license has been specified yet. Add a `LICENSE` file before distributing or
accepting external contributions.

---

## ภาษาไทย

### เกี่ยวกับโปรเจกต์

Shrinkly คือเว็บแอปสำหรับลดขนาดรูปภาพ วิดีโอ และไฟล์ทั่วไปโดยประมวลผลบน
เบราว์เซอร์ของผู้ใช้ รองรับการทำงานหลายไฟล์พร้อมกันและกำหนดขนาดเป้าหมายได้
จึงเหมาะสำหรับเตรียมไฟล์ก่อนส่งไปยังบริการที่จำกัดขนาด เช่น Discord

หน้าเว็บออกแบบให้สะอาด ใช้งานง่าย และรองรับทั้งคอมพิวเตอร์และโทรศัพท์มือถือ

### ความสามารถ

- ลากและวางหรือเลือกหลายไฟล์พร้อมกัน
- บีบอัดรูปภาพ วิดีโอ และไฟล์ทั่วไปเป็นชุด
- มีขนาดสำเร็จรูปสำหรับ Discord 10 MB และอีเมล 25 MB
- กำหนดขนาดเป้าหมายเป็น MB ได้เอง
- แสดงความคืบหน้าและผลลัพธ์แยกแต่ละไฟล์
- ดาวน์โหลดแยกไฟล์หรือรวมผลลัพธ์ทั้งหมดเป็น ZIP
- สลับภาษาอังกฤษและไทย พร้อมจดจำภาษาที่เลือก
- รองรับธีมมืดและธีมสว่าง โดยใช้ธีมมืดเป็นค่าเริ่มต้น
- UI แบบ Responsive ที่ได้แรงบันดาลใจจาก Vercel และ ChatGPT
- ประมวลผลในเบราว์เซอร์เพื่อรักษาความเป็นส่วนตัว
- ใช้ FFmpeg แบบประหยัดทรัพยากร จำกัด CPU 1 thread และทำทีละวิดีโอ
- ปรับความละเอียดและ fps ตามขนาดเป้าหมายเพื่อให้ภาพแตกน้อยลง
- Export เป็นเว็บ Static พร้อมนำขึ้น Vercel

### ไฟล์ที่รองรับ

| ประเภท | ตัวอย่าง | วิธีประมวลผล |
| --- | --- | --- |
| รูปภาพ | JPG, PNG, WebP | ค้นหาค่าคุณภาพที่เหมาะสม แปลงเป็น WebP/JPEG และลดความละเอียดตามสัดส่วนเมื่อจำเป็น |
| วิดีโอ | MP4, MOV และรูปแบบที่เบราว์เซอร์อ่านได้ | แปลงเป็น H.264/AAC และคำนวณ bitrate จากขนาดเป้าหมาย |
| ไฟล์ทั่วไป | เอกสาร ไฟล์บีบอัด และไฟล์ชนิดอื่น | บีบอัดแบบ DEFLATE ภายในไฟล์ ZIP |

### ความเป็นส่วนตัว

ไฟล์ที่เลือกจะอยู่บนอุปกรณ์ของคุณ โดยเบราว์เซอร์จะเป็นผู้อ่านและประมวลผล
ไฟล์เหล่านั้นจะไม่ถูกอัปโหลดไปยังเซิร์ฟเวอร์ของ Shrinkly

เมื่อบีบอัดวิดีโอ ระบบจะดาวน์โหลด FFmpeg WebAssembly runtime จาก jsDelivr
ในครั้งแรกที่ใช้งาน โดยดาวน์โหลดเฉพาะโปรแกรม FFmpeg เท่านั้น
วิดีโอของคุณจะไม่ถูกส่งไปยัง CDN

### ข้อจำกัดที่ควรทราบ

- คำว่า “ไม่เสียคุณภาพ” ในที่นี้หมายถึงรักษาคุณภาพที่มองเห็นให้ดีที่สุดภายใต้
  ขนาดที่กำหนด การลดขนาดรูปหรือวิดีโอลงมาก ๆ ไม่สามารถทำแบบ lossless
  ในเชิงคณิตศาสตร์ได้
- หากตั้งขนาดเป้าหมายเล็กมาก ระบบอาจต้องลดความละเอียดของรูป ลด fps หรือใช้
  bitrate วิดีโอที่ต่ำลง
- การบีบอัดวิดีโออาจใช้เวลาและหน่วยความจำมาก เพราะ FFmpeg ทำงานบนเครื่องผู้ใช้
  โดยระบบจะคืนหน่วยความจำของตัวเข้ารหัสเมื่องานชุดนั้นเสร็จ
- วิดีโอขนาดใหญ่มากประมาณ 1 GB ขึ้นไปยังติดข้อจำกัดหน่วยความจำของเบราว์เซอร์
  และ WebAssembly หากต้องทำงานกับไฟล์ใหญ่เป็นประจำ โปรแกรม Native หรือ
  ระบบเข้ารหัสฝั่งเซิร์ฟเวอร์จะเหมาะกว่า
- ไฟล์ที่ถูกบีบอัดอยู่แล้ว เช่น ZIP, JPEG, MP4 หรือ PDF อาจไม่เล็กลงเมื่อใส่ ZIP
- ขนาดผลลัพธ์อาจต่างจากเป้าหมายเล็กน้อย เนื่องจาก codec และ media container
  มีข้อมูลประกอบเพิ่มเติม
- การประมวลผลวิดีโอครั้งแรกต้องใช้อินเทอร์เน็ตเพื่อดาวน์โหลด FFmpeg runtime

### เทคโนโลยีที่ใช้

- Next.js 15
- React 19
- TypeScript
- FFmpeg WebAssembly
- JSZip
- Lucide React
- Browser Canvas API

### วิธีรันในเครื่อง

สิ่งที่ต้องมี:

- Node.js 20 หรือใหม่กว่า
- npm

ติดตั้ง dependencies และเปิด development server:

```bash
npm install
npm run dev
```

จากนั้นเปิด [http://localhost:3000](http://localhost:3000)

สร้าง production build:

```bash
npm run build
```

Next.js จะ Export เว็บ Static ไปยัง `out/` และ post-build script จะคัดลอก
ผลลัพธ์เดียวกันไปยัง `dist/`

### วิธีนำขึ้น Vercel

1. Push โปรเจกต์นี้ขึ้น GitHub repository ของคุณ
2. เปิด Vercel Dashboard แล้วเลือก **Add New → Project**
3. Import GitHub repository
4. ใช้ Framework ที่ตรวจพบเป็น **Next.js**
5. กด Deploy

โปรเจกต์นี้ไม่ต้องใช้ฐานข้อมูล API key หรือ environment variable

หากต้องการใช้ Vercel CLI:

```bash
npm install -g vercel
vercel
```

### สนับสนุนและติดต่อ

- [สนับสนุนผ่าน EasyDonate](https://easydonate.app/itsathitz)
- Email: [athitfkm@gmail.com](mailto:athitfkm@gmail.com)
- GitHub: [ohm41321/shrinkly-compress](https://github.com/ohm41321/shrinkly-compress)

### โครงสร้างโปรเจกต์

```text
.
├── app/
│   ├── globals.css          # Style หลักและ Responsive UI
│   ├── layout.tsx           # Root layout และ metadata
│   └── page.tsx             # หน้าหลัก
├── components/
│   └── Compressor.tsx       # คิวไฟล์และหน้าควบคุมการบีบอัด
├── lib/
│   └── compress.ts          # ระบบรูป วิดีโอ ZIP และดาวน์โหลด
├── scripts/
│   └── export-dist.mjs      # คัดลอก Static export ไปยัง dist/
├── next.config.mjs
├── package.json
├── tsconfig.json
└── vercel.json
```

### License

โปรเจกต์นี้ยังไม่ได้ระบุ License ควรเพิ่มไฟล์ `LICENSE`
ก่อนเผยแพร่หรือเปิดรับ contribution จากบุคคลอื่น
