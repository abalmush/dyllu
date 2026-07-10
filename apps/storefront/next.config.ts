import path from "node:path";
import type { NextConfig } from "next";
import checkEnvVariables from "./check-env-variables.js";

checkEnvVariables();

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(__dirname, "../../"),
  reactStrictMode: true,
  logging: {
    fetches: {
      fullUrl: true,
    },
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    loader: "custom",
    loaderFile: "./src/lib/util/image-loader.ts",
  },
};

export default nextConfig;

import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
initOpenNextCloudflareForDev();
