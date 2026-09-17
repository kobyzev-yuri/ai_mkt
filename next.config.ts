import type { NextConfig } from "next";

const demo = process.env.NEXT_PUBLIC_ATRIUM_APP === "demo";

const nextConfig: NextConfig = {
  distDir: demo ? ".next-demo" : ".next",
};

export default nextConfig;
