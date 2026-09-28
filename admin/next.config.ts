import path from 'node:path';
import type { NextConfig } from 'next';

// Go API server (../backend). Every /api/* request is
// proxied to it, so the browser only talks to this app's own origin.
const API_URL = process.env.API_URL || 'http://localhost:8080';

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname),
  },
  // Keep the dev badge away from the account menu at the bottom of the sidebar.
  devIndicators: {
    position: 'bottom-right',
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${API_URL}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
