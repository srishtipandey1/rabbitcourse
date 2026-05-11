/** @type {import('next').NextConfig} */
const nextConfig = {
  distDir: process.env.NEXT_DIST_DIR || '.next-check',
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
  },
  turbopack: {
    root: __dirname,
  },
  outputFileTracingRoot: __dirname,
}
module.exports = nextConfig
