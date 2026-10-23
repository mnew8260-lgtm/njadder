/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ["postgres", "telegram", "bcryptjs", "jose"],
};
export default nextConfig;
