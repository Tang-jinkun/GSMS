/** @type {import('next').NextConfig} */
const isWindows = process.platform === 'win32'

const nextConfig = {
  distDir: '.next-build',
  webpack: (config) => {
    if (isWindows) {
      config.cache = false
    }
    return config
  },
}

module.exports = nextConfig
