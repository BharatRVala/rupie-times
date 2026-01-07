/** @type {import('next').NextConfig} */
const nextConfig = {
  // output: 'export',
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
      },
    ],
  },
  // assetPrefix: '/rupieTimes/',  // 👈 Add your subdirectory name here
  // basePath: '/rupieTimes',      // 👈 Important for subfolder routing
};

export default nextConfig;