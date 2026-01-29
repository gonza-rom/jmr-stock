/** @type {import('next').NextConfig} */
const nextConfig = {
  reactCompiler: true,
  output: 'standalone',
  images: {
    unoptimized: true
  },
};

export default nextConfig;