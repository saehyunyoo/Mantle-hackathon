import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@jion/types", "@jion/mocks"],
};

export default nextConfig;
