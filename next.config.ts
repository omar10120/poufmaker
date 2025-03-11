import { NextConfig } from 'next';

const nextConfig: NextConfig = {
  experimental: {
    typedRoutes: false,
    serverActions: {
      bodySizeLimit: '2mb',
      allowedOrigins: ['*']
    }
  },
  typescript: {
    ignoreBuildErrors: true
  },
  eslint: {
    ignoreDuringBuilds: true, // ✅ Disable ESLint in production build
  },
};

export default nextConfig;
