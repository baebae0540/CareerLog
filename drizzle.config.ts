import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

// drizzle-kit은 Next.js 밖에서 돌기 때문에 .env.local을 직접 읽는다
config({ path: ".env.local", quiet: true });

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url: process.env.DATABASE_URL! },
});
