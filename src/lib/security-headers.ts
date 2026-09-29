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
  // Carefully designed to allow ad-network scripts while blocking arbitrary injection
  // Adsterra CDNs: *.highperformanceformat.com, *.profitabledisplayformat.com
  // Monetag CDNs: *.profitabledisplaynetwork.com, *.propellerads.com
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.highperformanceformat.com https://*.highrevenueformat.com https://*.profitabledisplaynetwork.com https://*.profitabledisplayformat.com https://*.profitabledisplayformat.com https://*.propellerads.com https://*.adsterra.com https://*.monetag.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' data: https://fonts.gstatic.com",
      "img-src 'self' data: https: blob:",
      "connect-src 'self' https://*.neon.tech",
      "frame-src 'self' https://*.highperformanceformat.com https://*.highrevenueformat.com https://*.profitabledisplaynetwork.com https://*.profitabledisplayformat.com https://*.propellerads.com https://*.adsterra.com https://*.monetag.com",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "upgrade-insecure-requests",
    ].join('; '),
  },
]
