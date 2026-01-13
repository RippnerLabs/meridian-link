import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  experimental:{
    externalDir: true,
  },
  serverExternalPackages: ["pino", "three"],
  transpilePackages: ["../../../../sol-bridge/target/idl"],
  eslint: {
    // Skip ESLint during production builds (many unused imports in UI components)
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Skip TypeScript errors during production builds
    ignoreBuildErrors: true,
  },
}

export default nextConfig
