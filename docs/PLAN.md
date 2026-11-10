# CareerLog 기획

- 작성: 2026-11-05
- 참고: [HANDOFF.md](../HANDOFF.md) (이전 프로젝트 applypad 인수인계)

## 1. 무엇인가

**나 혼자 쓰는** 이직 활동 기록장이다. 웹으로 어디서든(맥·윈도우·폰) 접속해 읽고 쓴다.
applypad와 목적은 같지만 범위를 줄였다. 포트폴리오 데모보다 **실제로 매일 쓰는 도구**가 우선이다.

## 2. 핵심 기능

| # | 기능 | 내용 |
| --- | --- | --- |
| 1 | 구직활동 등록 | 회사·포지션·공고 링크·지원 경로·지원일·메모를 등록, 목록·상세·수정·삭제 |
| 2 | 진행 상황 업데이트 | 상태 변경(이력 자동 기록), 일정(면접·과제·마감 등) 추가, 진행 메모 |
| 3 | 주간 모니터링 | 일~토 주간 캘린더에 일정·상태 변경·신규 지원을 표시, 주간 요약 숫자, 이전/다음 주 이동 |

### 상태

`관심 → 지원 → 서류 통과 → 면접 → 최종 → 합격 / 불합격`, 그리고 `보류(내가 중단)`.
상태는 단일 경로(`changeStatus` 서버 액션)로만 바꾸고, 바꿀 때마다 이력을 남긴다.

### 하지 않을 것

- 회원가입·다중 사용자·데모 계정 (사용자는 나 1명)
- 별도 API 서버, 모노레포, Docker
- 칸반 드래그앤드롭, 태그, 알림(메일·푸시), 파일 첨부 (예외: 지원 건 사진, 2026-11-10 개발자 요청)
- 마크다운 에디터 (메모는 일반 텍스트)
- 운영용 스케줄 워크플로 (필요해지면 배포 후에)

## 3. 기술 스택

| 영역 | 선택 | 이유 |
| --- | --- | --- |
| 앱 | Next.js 16 (App Router, Server Actions) + React 19 + TypeScript | 화면과 서버 로직을 한 프로젝트로. 호스팅 1곳 |
| 스타일 | Tailwind CSS 4 | |
| DB | PostgreSQL (Neon 무료) | 서버리스에서 파일 DB(SQLite) 사용 불가 |
| ORM | Drizzle ORM + drizzle-kit | 가볍고 네이티브 엔진·생성 단계 없음 |
| 인증 | 환경 변수 비밀번호 1개 → 서명된 HttpOnly 쿠키 | 사용자 1명이라 사용자 테이블 불필요 |
| 테스트 | vitest (날짜·주간 계산 등 순수 로직 위주) | |
| 패키지 | pnpm (단일 패키지) | |
| 배포 | Vercel(앱) + Neon(DB), GitHub `baebae0540/CareerLog` | push하면 자동 배포 |

Next.js는 `cacheComponents`를 **켜지 않는다** (applypad에서 Suspense 강제 문제가 있었음).

## 4. 데이터 모델 (초안)

```
applications        지원 건
  id, company, position, job_url, source(지원 경로),
  status, applied_at(날짜), memo, created_at, updated_at

status_changes      상태 변경 이력
  id, application_id → applications, from_status, to_status, note, changed_at

events              일정 (주간 캘린더의 주 재료)
  id, application_id → applications, kind(면접|과제|마감|기타),
  title, starts_at, memo, done, created_at
```

주간 화면은 해당 주 범위로 `events.starts_at`, `status_changes.changed_at`, `applications.applied_at`을 모아 보여준다.
시간대는 **Asia/Seoul** 기준으로 주(일요일 시작)를 계산한다.

## 5. 진행 순서

HANDOFF 교훈: **기능보다 배포를 먼저.**

| 단계 | 내용 | 완료 기준 |
| --- | --- | --- |
| 0 | 프로젝트 생성, 로그인, Neon 연결, GitHub·Vercel 첫 배포 | 배포 주소에서 로그인 후 빈 화면이 보인다 |
| 1 | 구직활동 등록 (CRUD) | 배포 주소에서 등록·수정·삭제 |
| 2 | 진행 상황 업데이트 (상태 변경 + 이력, 일정) | 상세 화면에서 상태·일정 관리 |
| 3 | 주간 모니터링 (주간 캘린더 + 요약) | 이번 주 / 이전·다음 주 확인 |

이후 후보: 대시보드 통계, CSV 내보내기, 월간 보기 — 모두 완료 (2026-11-10, 통계에 지원 경로별·주별 추이 포함).
