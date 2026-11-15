import type { NextConfig } from "next";

const dev = process.env.NODE_ENV !== "production";

/**
 * Content Security Policy for every route. Everything is served from this
 * origin: fonts are self-hosted by next/font, there is no analytics and no
 * third-party script, style, image or request.
 *
 * - script-src: 'self' plus 'unsafe-inline'. The pages are prerendered static
 *   HTML and Next.js boots them with inline scripts; a nonce would need every
 *   request rendered on a server. No 'unsafe-eval' in production (the dev
 *   server needs it for React's debugging tools, nothing else does).
 * - style-src: 'unsafe-inline' because motion and the charts set inline styles.
 * - img-src and media-src: blob: is the user's own Time capsule files, read
 *   from IndexedDB on this device. data: is for small inline images only.
 * - connect-src: 'self' (the 3D model is fetched from this origin). The dev
 *   server adds its hot-reload socket.
 */
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "media-src 'self' blob:",
  "font-src 'self'",
  `connect-src 'self'${dev ? " ws: wss:" : ""}`,
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(dev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "no-referrer" },
  { key: "X-Frame-Options", value: "DENY" },
  {
    key: "Permissions-Policy",
    // The microphone is the only device feature, and only for this origin (voice input).
    value:
      "microphone=(self), camera=(), geolocation=(), payment=(), usb=(), bluetooth=(), serial=(), hid=(), midi=(), " +
      "accelerometer=(), gyroscope=(), magnetometer=(), display-capture=(), screen-wake-lock=(), xr-spatial-tracking=(), browsing-topics=()",
  },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
];

const nextConfig: NextConfig = {
  cacheComponents: true,
  devIndicators: false,
  partialPrefetching: true,
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
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
