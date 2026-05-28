import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@jion/types", "@jion/mocks", "@jion/integrations"],
};

export default nextConfig;
