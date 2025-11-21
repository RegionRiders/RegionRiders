import bundleAnalyzer from '@next/bundle-analyzer';

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

export default withBundleAnalyzer({
  reactStrictMode: false,
  experimental: {
    optimizePackageImports: ['@mantine/core', '@mantine/hooks'],
  },
  // Empty turbopack config to acknowledge we're using Turbopack
  // This prevents webpack config errors and allows Turbopack to handle pino correctly
  turbopack: {},

  async headers() {
    const isDevelopment = process.env.NODE_ENV === 'development';

    // Only apply CORS headers in development
    if (!isDevelopment) {
      return [];
    }

    // Development-only CORS (for Storybook)
    return [
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
    ];
  },
});
