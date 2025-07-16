import type { NextConfig } from "next";
import TerserPlugin from "terser-webpack-plugin";

const nextConfig: NextConfig = {
  /* config options here */
  output: 'standalone',
  experimental: {
    turbo: {
    }
  },
  webpack: (config, { isServer, dev }) => {
    // Only apply webpack config when not using Turbopack
    // Turbopack is used in development when --turbopack flag is present
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
  // Turbopack experimental options (for development)
  
};

export default nextConfig;
