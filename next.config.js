/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: { unoptimized: true },
  webpack: (config) => {
    config.externals = [...(config.externals || []), "encoding"];
    return config;
  },
};

module.exports = nextConfig;
