import type { Metadata } from "next";
import "./globals.css";
import Providers from "@/components/providers";

export const metadata: Metadata = {
  title: "VoxVerity — AI Voice Integrity Verification",
  description:
    "Real-time voice integrity verification platform for detecting suspicious, synthetic, cloned, replayed, or manipulated voice activity in authorized communication contexts.",
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