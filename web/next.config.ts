import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  experimental:{
    externalDir: true,
    serverComponentsExternalPackages: ["pino", "three"]
  },
  transpilePackages: ["../../../../sol-bridge/target/idl"],
}

export default nextConfig
