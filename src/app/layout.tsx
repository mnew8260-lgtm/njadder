import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NJADDER PRO — أداة تيليجرام الذهبية",
  description: "118 أمر في 14 فئة — النسخة الاحترافية",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <body className="bg-[#0a0a0a] text-white antialiased">{children}</body>
    </html>
  );
}
