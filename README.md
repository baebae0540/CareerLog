# CareerLog

나 혼자 쓰는 이직 활동 기록 웹앱. 지원한 회사를 등록하고, 진행 상황을 업데이트하고, 주간 단위로 확인한다.

- 기획: [docs/PLAN.md](docs/PLAN.md)
- 작업 안내(실행 방법·규칙): [AGENTS.md](AGENTS.md)

Next.js 16 · Drizzle ORM · PostgreSQL(Neon) · Vercel

## 시작하기

```bash
pnpm install
cp .env.example .env.local   # 윈도우: copy .env.example .env.local
pnpm gen:secret              # 출력값을 SESSION_SECRET에
pnpm db:migrate
pnpm dev
```
