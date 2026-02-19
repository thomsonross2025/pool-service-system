/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    missingSuspenseWithCSRBailout: false,
  },
  serverExternalPackages: ['@prisma/client', 'prisma'],
}

module.exports = nextConfig
