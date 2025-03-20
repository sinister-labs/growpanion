let userConfig = undefined

const isProd = process.env.NODE_ENV === 'production';
const isTauri = process.env.NEXT_PUBLIC_DEPLOYMENT_MODE === 'tauri';
const internalHost = process.env.TAURI_DEV_HOST || 'localhost';
const internalPort = process.env.TAURI_DEV_PORT || '3000'

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: isTauri || process.env.EXPORT_MODE ? 'export' : undefined,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  env: {
    NEXT_PUBLIC_DEPLOYMENT_MODE: process.env.NEXT_PUBLIC_DEPLOYMENT_MODE || 'web'
  },
  assetPrefix: isProd ? undefined : `http://${internalHost}:${internalPort}`,
  devIndicators: {
    buildActivity: false,
  },
  experimental: {
    webpackBuildWorker: true,
    parallelServerBuildTraces: true,
    parallelServerCompiles: true,
  },
  trailingSlash: true,
}

mergeConfig(nextConfig, userConfig)

function mergeConfig(nextConfig, userConfig) {
  if (!userConfig) {
    return
  }

  for (const key in userConfig) {
    if (
      typeof nextConfig[key] === 'object' &&
      !Array.isArray(nextConfig[key])
    ) {
      nextConfig[key] = {
        ...nextConfig[key],
        ...userConfig[key],
      }
    } else {
      nextConfig[key] = userConfig[key]
    }
  }
}

export default nextConfig
