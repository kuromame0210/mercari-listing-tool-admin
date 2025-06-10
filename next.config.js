/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['static.mercdn.net', 'api.logo.wine'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.mercdn.net',
      },
    ],
  },
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  },
};

module.exports = nextConfig;