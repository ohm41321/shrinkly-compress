import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Shrinkly — Compress without compromise",
  description: "ลดขนาดรูป วิดีโอ และไฟล์ให้พอดีกับทุกแพลตฟอร์ม โดยไฟล์ไม่ออกจากเครื่องของคุณ"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="th">
      <body>{children}</body>
    </html>
  );
}
