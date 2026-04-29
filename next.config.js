const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Only use static export for production builds (Firebase Hosting)
  ...(process.env.NODE_ENV === 'production' ? { output: 'export', distDir: 'out' } : {}),
  trailingSlash: true,
  skipTrailingSlashRedirect: true,
  images: {
    unoptimized: true
  },
  turbopack: {
    root: path.resolve(__dirname),
  },
}

module.exports = nextConfig