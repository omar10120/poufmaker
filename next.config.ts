/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    typedRoutes: false,
    serverActions: {
      bodySizeLimit: '2mb',
      allowedOrigins: ['*']
    }
  },
  
  eslint: {
    ignoreDuringBuilds: true
  },

  typescript: {
    ignoreBuildErrors: true
  },

  // Configure output for Vercel deployment
  output: 'standalone',
  distDir: '.next',
  generateBuildId: async () => 'build'
};

export default nextConfig;
