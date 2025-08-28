import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Produce a standalone server for Docker runtime stage
  output: "standalone",
};

export default nextConfig;
