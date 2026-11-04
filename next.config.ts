import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // cacheComponents는 켜지 않는다 (applypad에서 Suspense 강제 문제가 있었음, AGENTS.md 참고)
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
