import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // cacheComponents는 켜지 않는다 (applypad에서 Suspense 강제 문제가 있었음, AGENTS.md 참고)
  experimental: {
    serverActions: {
      // 사진 올리기 (src/lib/image-input.ts의 MAX_UPLOAD_BATCH_BYTES 묶음 + 여유). Vercel 요청 한도 4.5MB 안쪽
      bodySizeLimit: "4mb",
    },
  },
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
