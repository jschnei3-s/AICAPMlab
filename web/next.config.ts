import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pdf-parse", "@react-pdf/renderer"],
  turbopack: {},
  webpack: (config, { isServer, nextRuntime, webpack }) => {
    if (isServer && nextRuntime === "nodejs") {
      config.plugins.push(
        new webpack.DefinePlugin({
          __dirname: JSON.stringify(process.cwd()),
        })
      );
    }
    return config;
  },
};

export default nextConfig;
