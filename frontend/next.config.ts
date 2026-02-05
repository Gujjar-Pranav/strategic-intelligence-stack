import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  //  REQUIRED so Vercel includes Chromium binaries at runtime
  outputFileTracingIncludes: {
    "/api/exec-pdf": ["./node_modules/@sparticuz/chromium/**"],
  },
};

export default nextConfig;
