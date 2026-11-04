import { z } from "zod";

const schema = z.object({
  DATABASE_URL: z.url(),
  APP_PASSWORD: z.string().min(12, "APP_PASSWORD는 12자 이상이어야 합니다"),
  SESSION_SECRET: z.string().min(32, "SESSION_SECRET은 32자 이상이어야 합니다"),
});

export type ServerEnv = z.infer<typeof schema>;

let cached: ServerEnv | undefined;

/** 서버 환경 변수. 처음 호출할 때 검증하고, 빠진 값이 있으면 이름을 알려주며 실패한다. */
export function serverEnv(): ServerEnv {
  if (!cached) {
    const result = schema.safeParse(process.env);
    if (!result.success) {
      const detail = result.error.issues
        .map((i) => `- ${i.path.join(".")}: ${i.message}`)
        .join("\n");
      throw new Error(`환경 변수 설정이 잘못되었습니다 (.env.local 확인):\n${detail}`);
    }
    cached = result.data;
  }
  return cached;
}
