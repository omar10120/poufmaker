import { NextConfig } from 'next';

const nextConfig: NextConfig = {
  experimental: {
    typedRoutes: false,
    serverActions: {
      bodySizeLimit: '2mb',
      allowedOrigins: ['*']
    }
  },
  
  eslint: {
    ignoreDuringBuilds: true, // Disable ESLint in production build
  },

  typescript: {
    ignoreBuildErrors: true, // Disable TypeScript errors during production build
  },

  // Disable CSS minification and optimization
  optimizeFonts: false,
  swcMinify: false,
  
  webpack: (config) => {
    config.optimization.minimize = false;
    return config;
  }
};

export default nextConfig;
