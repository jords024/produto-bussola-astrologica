/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  devIndicators: false,
  allowedDevOrigins: ["bussolaappfront.aryaraj.shop", "*.aryaraj.shop"],
};

export default nextConfig;
