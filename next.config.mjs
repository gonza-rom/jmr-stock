/** @type {import('next').NextConfig} */
const nextConfig = {
  reactCompiler: true,
  // NO incluir output: 'standalone' para Vercel
  images: {
    unoptimized: true
  },
};

export default nextConfig;