import type { NextConfig } from "next";

const isTauri = process.env.TAURI_ENV_PLATFORM !== undefined;

const nextConfig: NextConfig = {
  // Static export for Tauri desktop build
  ...(isTauri && {
    output: "export",
    images: { unoptimized: true },
  }),

  // For web deployment (non-Tauri), keep server rendering
  ...((!isTauri) && {
    images: { unoptimized: true },
  }),
};

export default nextConfig;
