import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow mobile and tunneled origins to request dev-only Next assets.
  allowedDevOrigins: [
    "localhost",
    "*.localhost",
    "127.0.0.1",
    "0.0.0.0",
    "*.*.*.*",
    "*.local",
    "*.github.dev",
    "*.app.github.dev",
    "*.ngrok-free.app",
  ],
};

export default nextConfig;
