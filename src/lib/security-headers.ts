// Security headers configuration for Next.js
// Applied via next.config.ts headers() function

export const securityHeaders = [
  // Prevent MIME type sniffing
  { key: 'X-Content-Type-Options', value: 'nosniff' },

  // Prevent clickjacking
  { key: 'X-Frame-Options', value: 'DENY' },

  // Control referrer information
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },

  // Permissions policy (disable dangerous features)
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), magnetometer=(), gyroscope=()',
  },

  // HSTS — force HTTPS in production
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },

  // XSS protection (legacy but still useful for older browsers)
  { key: 'X-XSS-Protection', value: '1; mode=block' },

  // Content Security Policy
  //
  // Design philosophy: This is an ad-supported creator platform. Ad networks
  // (Adsterra, Monetag, etc.) dynamically rotate CDN domains for serving
  // creatives, tracking pixels, and analytics — e.g., a single Adsterra
  // banner request can hit highrevenueformat.com (script), then load a
  // creative iframe from realizationnewestfangs.com, then fire tracking
  // pixels to protrafficinspector.com, all in the same render cycle.
  //
  // An allowlist-based CSP cannot keep up with this — the ad networks add
  // new domains constantly and there's no way to enumerate them all.
  //
  // Our approach:
  //   * script-src — STRICT allowlist. Only allow scripts from our own
  //     origin + the ad-network CDN domains we explicitly trust. This is
  //     the directive that protects against XSS, so it stays tight.
  //   * connect-src / frame-src / img-src — BROAD https:. Once a script is
  //     loaded (and trusted), it can fetch creatives/pixels/iframes from
  //     any HTTPS origin. This is the only way to support rotating ad-
  //     network domains without breaking ads every few weeks.
  //   * default-src 'self' — anything not explicitly allowed is blocked.
  //   * object-src 'none' — no Flash/Java plugins, ever.
  //   * frame-ancestors 'none' — nobody can embed us (clickjacking).
  //   * base-uri 'self' — no <base> tag injection.
  //   * form-action 'self' — no form submissions to third parties.
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      // Scripts: strict allowlist (XSS protection). Add new ad-network
      // script CDNs here as you onboard them.
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.highperformanceformat.com https://*.highrevenueformat.com https://*.profitabledisplaynetwork.com https://*.profitabledisplayformat.com https://*.propellerads.com https://*.adsterra.com https://*.monetag.com https://*.protrafficinspector.com",
      // Styles: self + Google Fonts (for the Geist/Inter font CSS).
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      // Fonts: self + data: (for inlined font fallbacks) + gstatic.
      "font-src 'self' data: https://fonts.gstatic.com",
      // Images: any HTTPS (ad creatives + tracking pixels come from
      // rotating domains that cannot be enumerated).
      "img-src 'self' data: https: blob:",
      // Connect (fetch/XHR/WebSocket): any HTTPS. Ad-network invoke.js
      // scripts fetch creatives + tracking beacons from rotating domains
      // like realizationnewestfangs.com, protrafficinspector.com, etc.
      "connect-src 'self' https: wss:",
      // Frames: any HTTPS. Adsterra BANNER format loads the creative in
      // an iframe from a rotating domain (e.g., realizationnewestfangs.com).
      "frame-src 'self' https: blob:",
      "child-src 'self' https: blob:",
      // Media: any HTTPS (some ad formats include video/audio).
      "media-src 'self' https: blob:",
      // Workers: self only.
      "worker-src 'self' blob:",
      // No plugins (Flash/Java/PDF embeds).
      "object-src 'none'",
      // No <base> tag injection.
      "base-uri 'self'",
      // Forms can only submit to self.
      "form-action 'self'",
      // Nobody can embed us in an iframe (clickjacking protection).
      "frame-ancestors 'none'",
      // Auto-upgrade http: requests to https:.
      "upgrade-insecure-requests",
    ].join('; '),
  },
]
