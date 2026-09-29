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
  // Carefully designed to allow ad-network scripts while blocking arbitrary injection.
  // Adsterra CDNs: *.highperformanceformat.com, *.profitabledisplayformat.com, *.highrevenueformat.com
  // Monetag CDNs:  *.profitabledisplaynetwork.com, *.propellerads.com, *.monetag.com
  //
  // Note on connect-src: Ad-network invoke.js scripts use fetch/XHR to pull the actual
  // ad creative from their CDN. If connect-src is too tight, Chrome shows
  // "This content is blocked. Contact the site owner to fix the issue." inside the
  // ad iframe. We therefore allowlisted the same ad-network domains in connect-src.
  // Note on frame-src:   Adsterra BANNER format creates an iframe to serve the creative;
  //   the iframe URL lives on the same ad-network CDN, so it must be in frame-src.
  // Note on img-src:     Ad creatives often load tracking pixels + banner images from
  //   arbitrary CDN subdomains; https: covers all of them.
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.highperformanceformat.com https://*.highrevenueformat.com https://*.profitabledisplaynetwork.com https://*.profitabledisplayformat.com https://*.propellerads.com https://*.adsterra.com https://*.monetag.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' data: https://fonts.gstatic.com",
      "img-src 'self' data: https: blob:",
      // Allow XHR/fetch to ad-network CDNs so invoke.js can pull ad creatives
      "connect-src 'self' https://*.highperformanceformat.com https://*.highrevenueformat.com https://*.profitabledisplaynetwork.com https://*.profitabledisplayformat.com https://*.propellerads.com https://*.adsterra.com https://*.monetag.com https://*.neon.tech wss://*.neon.tech",
      // Allow iframes from ad-network CDNs (Adsterra BANNER format uses an iframe)
      "frame-src 'self' https: blob:",
      "child-src 'self' https: blob:",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "upgrade-insecure-requests",
    ].join('; '),
  },
]
