import { existsSync } from "node:fs";
import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  devIndicators: false,
  partialPrefetching: true,
  env: {
    // The 3D body uses public/models/body.glb when present, else a procedural figure.
    NEXT_PUBLIC_HAS_BODY_GLB: existsSync(path.join(process.cwd(), "public/models/body.glb"))
      ? "1"
      : "",
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
