import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Environment variables
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
  },
  
  // Enable image optimization
  images: {
    domains: [],
    unoptimized: false,
  },
  
  // TypeScript configuration
  typescript: {
    ignoreBuildErrors: false,
  },
};

export default nextConfig;
