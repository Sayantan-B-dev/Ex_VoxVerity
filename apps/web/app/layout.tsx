import type { Metadata, Viewport } from "next";
import "./globals.css";
import Providers from "@/components/providers";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: "VoxVerity - AI Voice Integrity Verification",
    template: "%s | VoxVerity",
  },
  description:
    "VoxVerity is a real-time voice integrity verification platform. It detects synthetic, cloned, replayed, or manipulated voice activity in live calls with per-chunk risk scoring, speaker verification, evidence packaging, and on-chain registration.",
  applicationName: "VoxVerity",
  keywords: [
    "voice integrity",
    "voice authentication",
    "anti-spoofing",
    "voice cloning detection",
    "speaker verification",
    "AASIST",
    "ECAPA-TDNN",
    "realtime risk scoring",
    "WebRTC",
    "voice fraud prevention",
  ],
  authors: [{ name: "VoxVerity" }],
  creator: "VoxVerity",
  publisher: "VoxVerity",
  formatDetection: { telephone: false },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    type: "website",
    siteName: "VoxVerity",
    title: "VoxVerity - AI Voice Integrity Verification",
    description:
      "Real-time detection of synthetic, cloned, replayed, or manipulated voice in live calls. Per-chunk risk scoring, speaker verification, and blockchain-backed evidence.",
    images: [
      {
        url: "/brand/voxverity/voxverity-full-dark.png",
        width: 1200,
        height: 630,
        alt: "VoxVerity voice integrity platform",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "VoxVerity - AI Voice Integrity Verification",
    description:
      "Real-time detection of synthetic, cloned, replayed, or manipulated voice in live calls.",
    images: ["/brand/voxverity/voxverity-full-dark.png"],
  },
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="h-full">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
