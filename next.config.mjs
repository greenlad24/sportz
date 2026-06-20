/** @type {import('next').NextConfig} */
const nextConfig = {
  // פלט עצמאי - אריזה קלה ל-Docker / DigitalOcean droplet
  output: "standalone",
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
    ],
  },
};

export default nextConfig;
