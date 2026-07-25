import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Shrinkly — Compress without compromise",
  description: "Compress images, videos, and files for any platform without uploading them from your device."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-theme="dark">
      <body>{children}</body>
    </html>
  );
}
