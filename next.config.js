/** @type {import('next').NextConfig} */
const nextConfig = {
  // Habilita output standalone para Docker (reduce imagen de ~1GB a ~150MB)
  output: 'standalone',

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'via.placeholder.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'cdn.simpleicons.org',
        pathname: '/**',
      },
    ],
    formats: ['image/avif', 'image/webp'],
  },

  async headers() {
    // Content-Security-Policy — permite recursos propios + Vercel Analytics
    const ContentSecurityPolicy = `
      default-src 'self';
      script-src  'self' 'unsafe-inline' 'unsafe-eval' https://va.vercel-scripts.com;
      style-src   'self' 'unsafe-inline' https://fonts.googleapis.com;
      font-src    'self' https://fonts.gstatic.com;
      img-src     'self' data: blob: https://images.unsplash.com https://via.placeholder.com https://cdn.simpleicons.org;
      connect-src 'self' https://vitals.vercel-insights.com https://va.vercel-scripts.com;
      frame-ancestors 'none';
    `.replace(/\s{2,}/g, ' ').trim();

    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'Content-Security-Policy',   value: ContentSecurityPolicy },
          { key: 'X-Frame-Options',            value: 'DENY' },
          { key: 'X-Content-Type-Options',     value: 'nosniff' },
          { key: 'Referrer-Policy',            value: 'strict-origin-when-cross-origin' },
          { key: 'X-XSS-Protection',           value: '1; mode=block' },
          { key: 'Strict-Transport-Security',  value: 'max-age=63072000; includeSubDomains; preload' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
