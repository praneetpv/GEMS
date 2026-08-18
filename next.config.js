/** @type {import('next').NextConfig} */
const nextConfig = {
  // Default 1MB body limit is too small for a multi-hundred-row roster
  // upload (admin/import).
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
};

module.exports = nextConfig;
