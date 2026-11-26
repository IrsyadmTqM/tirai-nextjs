import type { Metadata, Viewport } from "next";
import { Fredoka, Nunito } from "next/font/google";
import "./globals.css";

// Diunduh saat build dan disajikan dari server sendiri: browser tidak menghubungi Google.
const fredoka = Fredoka({ subsets: ["latin"], variable: "--font-fredoka", display: "swap" });
const nunito = Nunito({ subsets: ["latin"], variable: "--font-nunito", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Tirai: ZISWAF yang menjaga amanah", template: "%s · Tirai" },
  description:
    "Sistem informasi ZISWAF privacy-first: data mustahik dienkripsi di perangkat, setiap akses tercatat, dan pemilik data memegang kendali.",
};

export const viewport: Viewport = { themeColor: "#2f5d57" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="id" className={`${fredoka.variable} ${nunito.variable} h-full antialiased`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
