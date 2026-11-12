import type { NextConfig } from "next";
import { ROBOTS } from "./lib/oeffentlich";

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: [{ key: "X-Robots-Tag", value: ROBOTS }] }];
  },
};

export default nextConfig;
