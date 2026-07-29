import type { NextConfig } from 'next';

export function createContentSecurityPolicy(
  nodeEnvironment = process.env.NODE_ENV,
  apiUrl = process.env.NEXT_PUBLIC_API_URL,
) {
  const isDevelopment = nodeEnvironment !== 'production';
  const apiOrigin = (() => {
    try {
      return new URL(apiUrl ?? 'http://localhost:4000').origin;
    } catch {
      return "'self'";
    }
  })();

  return [
    "default-src 'self'",
    "base-uri 'self'",
    `connect-src 'self' ${apiOrigin}`,
    "font-src 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "img-src 'self' data: blob:",
    "object-src 'none'",
    `script-src 'self' 'unsafe-inline'${isDevelopment ? " 'unsafe-eval'" : ''}`,
    "style-src 'self' 'unsafe-inline'",
    "worker-src 'self'",
    ...(isDevelopment ? [] : ['upgrade-insecure-requests']),
  ].join('; ');
}

const contentSecurityPolicy = createContentSecurityPolicy();

const nextConfig: NextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'Content-Security-Policy', value: contentSecurityPolicy },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          {
            key: 'Permissions-Policy',
            value:
              'camera=(), geolocation=(), microphone=(), payment=(), usb=()',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
