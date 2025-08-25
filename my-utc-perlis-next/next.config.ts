import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable standalone output for Docker deployment
  output: 'standalone',
  
  // Environment variables (fallback if not set in environment)
  env: {
    NEXT_PUBLIC_STRAPI_API_URL: process.env.NEXT_PUBLIC_STRAPI_API_URL || 'https://strapi.utcperlis.com',
  },
  
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
        hostname: process.env.STRAPI_HOSTNAME || 'strapi.utcperlis.com',
        pathname: '/uploads/**',
      },
      // Add additional pattern for any Strapi instance
      {
        protocol: 'http',
        hostname: process.env.STRAPI_HOSTNAME || 'strapi.utcperlis.com',
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
