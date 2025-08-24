import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable standalone output for Docker deployment
  output: 'standalone',
  
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '1337',
        pathname: '/uploads/**',
      },
      // Add production Strapi URL pattern
      {
        protocol: 'https',
        hostname: process.env.STRAPI_HOSTNAME || 'strapi.yourdomain.com',
        pathname: '/uploads/**',
      },
    ],
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // Experimental features for better performance
  // experimental: {
  //   optimizeCss: true, // Disabled due to critters dependency issue
  // },
};

export default nextConfig;
