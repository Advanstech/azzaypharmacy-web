import type { NextConfig } from "next";

const isTauri = process.env.TAURI_ENV_PLATFORM !== undefined;

const nextConfig: NextConfig = {
  images: { unoptimized: true },
  allowedDevOrigins: ['192.168.100.15'],

  // Enable static export for Tauri desktop builds
  ...(isTauri && {
    output: "export",
    trailingSlash: true,
  }),
};

export default nextConfig;
