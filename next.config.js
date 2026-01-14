/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  async rewrites() {
    return [
      {
        source: '/api/voiceagent/:path*',
        destination: 'http://localhost:8080/voiceagent/:path*',
      },
    ];
  },
}

module.exports = nextConfig
