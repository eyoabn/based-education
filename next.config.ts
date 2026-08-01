import type { NextConfig } from 'next'

// =============================================================================
// SECURITY HEADERS
// Applied to every response via the headers() function below.
// Vercel / Cloudflare also let you add headers at the edge — these are the
// server-side fallback that works on any hosting platform.
// =============================================================================
const SECURITY_HEADERS = [
  // Prevent this app from being embedded in an iframe on another origin.
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  // Stop browsers from sniffing the MIME type of a response.
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // Tell browsers to only send origin on same-origin requests.
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // Limit camera/mic/geolocation access to the same origin only.
  // LiveKit requires camera & microphone on the live-room pages;
  // we set those origins explicitly in the Live Room component via
  // the getUserMedia constraints — the header allows the document-level grant.
  {
    key: 'Permissions-Policy',
    value: 'camera=(self), microphone=(self), geolocation=()',
  },
  // HSTS — force HTTPS for 1 year, include subdomains.
  // Remove 'preload' if you are not on the HSTS preload list yet.
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=31536000; includeSubDomains; preload',
  },
  // CSP — defence-in-depth against XSS.
  // LiveKit client connects over WebSocket (wss:) and loads STUN/TURN;
  // those are covered by connect-src.
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      // Inline scripts are required by Next.js hydration chunks.
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      // Inline styles + Google Fonts.
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      // Images: self, data URIs, DiceBear avatars, CDN, Unsplash.
      [
        "img-src 'self' data: blob:",
        'https://api.dicebear.com',
        'https://images.unsplash.com',
        process.env.NEXT_PUBLIC_STORAGE_URL ?? '',
      ].join(' '),
      // WebSocket to LiveKit + Next.js HMR in dev.
      [
        "connect-src 'self'",
        process.env.NEXT_PUBLIC_LIVEKIT_URL ?? 'wss://live.educonnect.com',
        process.env.NEXT_PUBLIC_APP_URL ?? '',
        // Allow HMR websocket in development.
        process.env.NODE_ENV === 'development' ? 'ws://localhost:*' : '',
      ]
        .filter(Boolean)
        .join(' '),
      // Camera & microphone for WebRTC.
      "media-src 'self' blob: mediastream:",
      // Web Workers used by LiveKit's Opus/VP8 encoders.
      "worker-src 'self' blob:",
      // Frame sources — only same origin (no third-party iframes).
      "frame-src 'self'",
    ].join('; '),
  },
]

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // ── Image optimisation ──────────────────────────────────────────────────
  images: {
    remotePatterns: [
      // DiceBear — generated avatars for users without a custom photo.
      { protocol: 'https', hostname: 'api.dicebear.com' },
      // Unsplash — demo/placeholder images.
      { protocol: 'https', hostname: 'images.unsplash.com' },
      // Cloudflare R2 / AWS S3 CDN — production user uploads.
      // Adjust the hostname to match your bucket's public domain.
      { protocol: 'https', hostname: '*.r2.cloudflarestorage.com' },
      { protocol: 'https', hostname: '*.amazonaws.com' },
      // Custom CDN (e.g. cdn.educonnect.com pointing at R2).
      {
        protocol: 'https',
        hostname: process.env.NEXT_PUBLIC_STORAGE_URL
          ? new URL(process.env.NEXT_PUBLIC_STORAGE_URL).hostname
          : 'cdn.educonnect.com',
      },
    ],
    // Modern formats — avoids serving JPEG when WebP/AVIF is available.
    formats: ['image/avif', 'image/webp'],
    // Give cached optimised images a long TTL.
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 days
  },

  // ── Compiler ────────────────────────────────────────────────────────────
  compiler: {
    // Strip console.log from production builds — keeps client bundles clean.
    removeConsole:
      process.env.NODE_ENV === 'production'
        ? { exclude: ['error', 'warn'] }
        : false,
  },

  // ── Experimental ────────────────────────────────────────────────────────
  experimental: {
    // Server Actions are stable in Next.js 15 — keep the explicit opt-in
    // for tooling compatibility.
    serverActions: {
      // Maximum allowed body size for Server Action requests.
      // 10 MB covers quiz submission payloads with base64-encoded images.
      bodySizeLimit: '10mb',
    },
  },

  // ── WebRTC / LiveKit compatibility ──────────────────────────────────────
  // Some LiveKit SDK internals use Node.js APIs (crypto, dgram) that are
  // not available in the Edge runtime. Marking them as externals prevents
  // the bundler from trying to polyfill them in server-side bundles.
  serverExternalPackages: ['livekit-server-sdk'],

  // ── Security headers ────────────────────────────────────────────────────
  async headers() {
    return [
      {
        // Apply to every route.
        source: '/(.*)',
        headers: SECURITY_HEADERS,
      },
      {
        // LiveKit token endpoint — ensure CORS is open for the SDK.
        source: '/api/live/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: process.env.NEXT_PUBLIC_APP_URL ?? '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, POST, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
        ],
      },
      {
        // SSE stream — prevent buffering proxies from dropping the connection.
        source: '/api/notifications/stream',
        headers: [
          { key: 'X-Accel-Buffering', value: 'no' },
          { key: 'Cache-Control', value: 'no-cache, no-transform' },
        ],
      },
    ]
  },

  // ── Redirects ───────────────────────────────────────────────────────────
  async redirects() {
    return [
      // www → apex redirect.
      {
        source: '/(.*)',
        has: [{ type: 'host', value: 'www.educonnect.com' }],
        destination: 'https://educonnect.com/:path*',
        permanent: true,
      },
    ]
  },
}

export default nextConfig
