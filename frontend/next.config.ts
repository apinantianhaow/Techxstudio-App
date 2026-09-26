import path from 'node:path';
import type { NextConfig } from 'next';

// Go API server (see ../backend). Every /api/* request is proxied to it,
// so client code keeps calling same-origin paths like fetch('/api/products').
const API_URL = process.env.API_URL || 'http://localhost:8080';

const nextConfig: NextConfig = {
  // frontend/ is its own project; don't treat the repo root as the workspace.
  turbopack: {
    root: path.resolve(__dirname),
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
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
