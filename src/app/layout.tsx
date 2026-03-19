import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Header from "@/components/layout/Header";
import BottomNav from "@/components/layout/BottomNav";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MindWallet — 浪費原因分析AI家計簿",
  description:
    "AIで浪費の心理的要因を分析し、根本的な支出改善を支援するスマート家計簿アプリ",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <div className="relative mx-auto min-h-screen max-w-md">
          <Header />
          <main className="px-4 pb-20 pt-4">{children}</main>
          <BottomNav />
        </div>
      </body>
    </html>
  );
}
