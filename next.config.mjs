import bundleAnalyzer from '@next/bundle-analyzer';
import { developmentCSP, productionCSP } from './lib/security/csp.mjs';

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

export default withBundleAnalyzer({
  reactStrictMode: false,
  experimental: {
    optimizePackageImports: ['@mantine/core', '@mantine/hooks'],
  },
  turbopack: {},

  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
      },
      {
        protocol: 'https',
        hostname: 'localhost',
      },
    ],
    formats: ['image/webp', 'image/avif'],
  },

  async headers() {
    const isDev = process.env.NODE_ENV === 'development';
    const csp = Object.entries(isDev ? developmentCSP : productionCSP)
      .map(([key, values]) => `${key} ${values.join(' ')}`)
      .join('; ');

    const securityHeaders = [
      {
        key: 'X-DNS-Prefetch-Control',
        value: 'on',
      },
      {
        key: 'Strict-Transport-Security',
        value: 'max-age=63072000; includeSubDomains; preload',
      },
      {
        key: 'X-Frame-Options',
        value: 'SAMEORIGIN',
      },
      {
        key: 'X-Content-Type-Options',
        value: 'nosniff',
      },
      {
        key: 'Referrer-Policy',
        value: 'strict-origin-when-cross-origin',
      },
      {
        key: 'Permissions-Policy',
        value: 'camera=(), microphone=(), geolocation=()',
      },
      {
        key: 'Content-Security-Policy',
        value: csp,
      },
    ];

    const corsHeaders = isDev
      ? [
          {
            source: '/data/:path*',
            headers: [
              { key: 'Access-Control-Allow-Origin', value: 'http://localhost:6006' },
              { key: 'Access-Control-Allow-Methods', value: 'GET, OPTIONS' },
              { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
            ],
          },
          {
            source: '/api/:path*',
            headers: [
              { key: 'Access-Control-Allow-Origin', value: 'http://localhost:6006' },
              { key: 'Access-Control-Allow-Methods', value: 'GET, POST, OPTIONS' },
              { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
            ],
          },
        ]
      : [];

    return [{ source: '/:path*', headers: securityHeaders }, ...corsHeaders];
  },

  serverExternalPackages: ['pino', 'thread-stream'],
});
