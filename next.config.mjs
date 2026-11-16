/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["passkit-generator", "exceljs", "pdf-lib"],
  },
};

export default nextConfig;
