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
      // Externalize snowflake-sdk to prevent webpack from bundling it
      config.externals.push({
        'snowflake-sdk': 'commonjs snowflake-sdk'
      });
    }
    return config;
  },
  experimental: {
    serverComponentsExternalPackages: ['snowflake-sdk']
  }
}

export default nextConfig