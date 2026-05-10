import type { NextConfig } from "next";

const isTauri = process.env.TAURI_ENV_PLATFORM !== undefined;
const isTauriBuild = isTauri && process.env.NODE_ENV === "production";

const nextConfig: NextConfig = {
  // Disable static export for Tauri to support dynamic routes
  // ...(isTauriBuild && {
  //   output: "export",
  //   images: { unoptimized: true },
  // }),

  // For all deployments, keep server rendering
  images: { unoptimized: true },
};

export default nextConfig;
