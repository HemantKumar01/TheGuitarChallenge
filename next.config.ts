import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow HMR WebSocket connections when accessing via LAN IP (e.g. 192.168.x.x)
  // Next.js 16 blocks non-localhost WebSocket upgrades by default; this whitelists the subnet.
  allowedDevOrigins: ["192.168.31.85"],
};

export default nextConfig;
