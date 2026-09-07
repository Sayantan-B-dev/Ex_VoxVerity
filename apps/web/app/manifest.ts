import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "VoxVerity - AI Voice Integrity Verification",
    short_name: "VoxVerity",
    description:
      "Real-time voice integrity verification: detect synthetic, cloned, replayed, or manipulated voice in live calls.",
    start_url: "/",
    display: "standalone",
    background_color: "#000000",
    theme_color: "#000000",
    icons: [
      {
        src: "/brand/voxverity/voxverity-icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/brand/voxverity/voxverity-icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
