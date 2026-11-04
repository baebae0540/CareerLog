import "server-only";
import { neon } from "@neondatabase/serverless";
import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import { serverEnv } from "@/lib/env";
import * as schema from "./schema";

// 처음 쓸 때 연결한다 (빌드 시점에 DATABASE_URL이 없어도 빌드가 깨지지 않도록)
let instance: NeonHttpDatabase<typeof schema> | undefined;

export function getDb() {
  if (!instance) {
    instance = drizzle(neon(serverEnv().DATABASE_URL), { schema });
  }
  return instance;
}
