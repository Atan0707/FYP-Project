import type { NextConfig } from "next";
import TerserPlugin from "terser-webpack-plugin";

const nextConfig: NextConfig = {
  /* config options here */
  webpack: (config, { isServer, dev }) => {
    if(!dev) {
      if (!isServer) {
        config.resolve.fallback = {
          crypto: require.resolve('crypto-js'),
          stream: false,
          buffer: false
        };
      }
      config.optimization.minimizer = [
        new TerserPlugin({
          terserOptions: {
            mangle: false, // Disable function renaming
            keep_fnames: true, // Preserve function names (prevents SHA256 loss)
            keep_classnames: true // Preserve class names (for internal PDFKit use)
          }
        })
      ];
    }
    return config;
  }
};

export default nextConfig;
