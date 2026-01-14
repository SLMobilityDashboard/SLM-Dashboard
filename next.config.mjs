/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  output: 'standalone',
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Mark snowflake-sdk as external for server builds
      config.externals = [...(config.externals || []), 'snowflake-sdk'];
    }
    return config;
  },
  experimental: {
    // Prevent bundling of snowflake-sdk in server components
    serverComponentsExternalPackages: ['snowflake-sdk'],
  },
}

export default nextConfig