// 체험 계정의 예시 데이터 (순수 함수, 테스트 있음).
// 날짜는 모두 오늘 기준 상대값이라 언제 체험해도 주간·월간·통계(최근 12주) 화면이 채워진다.
// 회사 이름은 모두 지어낸 것이다.
import type { ApplicationStatus, EventKind } from "@/db/schema";
import { addDays, seoulDateTime } from "@/lib/dates";

/** 체험 계정 유지 시간 */
export const DEMO_TTL_HOURS = 24;
/** 동시에 살아 있는 체험 계정 수 한도 (DB 용량 보호) */
export const MAX_DEMO_ACCOUNTS = 100;
/** 체험 계정 한도: 지원 건·일정 수, 사진 장수·크기 */
export const DEMO_MAX_APPLICATIONS = 50;
export const DEMO_MAX_EVENTS = 200;
export const DEMO_MAX_IMAGES = 5;
export const DEMO_MAX_IMAGE_BYTES = 1024 * 1024;

/** [상태, 오늘로부터 며칠(음수 = 과거), 메모] */
type Step = [ApplicationStatus, number, string?];
/** [종류, 제목, 오늘로부터 며칠, 시각(null = 시간 미정), 완료] */
type EventSpec = [EventKind, string, number, string | null, boolean];
type AppSpec = {
  company: string;
  position: string;
  source: string | null;
  memo?: string;
  steps: Step[];
  events?: EventSpec[];
};

const SPECS: AppSpec[] = [
  {
    company: "하늘소프트",
    position: "백엔드 개발자",
    source: "원티드",
    memo: "결제 시스템 팀. 연봉 협의 완료.",
    steps: [["applied", -70], ["document_passed", -63], ["interview", -55, "1차 기술 면접"], ["final", -45], ["offer", -38, "처우 협의 완료"]],
    events: [["interview", "1차 기술 면접", -55, "14:00", true], ["interview", "임원 면접", -45, "10:30", true]],
  },
  {
    company: "바른데이터",
    position: "데이터 엔지니어",
    source: "지인 추천",
    memo: "추천인: 전 직장 동료. 파이프라인 경험 강조.",
    steps: [["applied", -40], ["interview", -30, "서류 없이 바로 면접"], ["final", -12]],
    events: [["interview", "1차 면접", -30, "11:00", true], ["interview", "최종 면접", 2, "15:00", false]],
  },
  {
    company: "누리페이",
    position: "백엔드 개발자",
    source: "원티드",
    steps: [["applied", -33], ["document_passed", -26], ["interview", -4]],
    events: [["assignment", "코딩 과제 제출", -20, null, true], ["interview", "1차 기술 면접", -4, "16:00", true], ["interview", "2차 컬처핏 면접", 5, "13:00", false]],
  },
  {
    company: "온길모빌리티",
    position: "서버 개발자",
    source: "사람인",
    steps: [["applied", -21], ["document_passed", -10]],
    events: [["assignment", "사전 과제", -1, null, false], ["deadline", "과제 제출 마감", 3, "23:59", false]],
  },
  {
    company: "새봄헬스케어",
    position: "풀스택 개발자",
    source: "회사 홈페이지",
    steps: [["applied", -15], ["document_passed", -6]],
    events: [["interview", "1차 면접", 8, null, false]],
  },
  {
    company: "다온커머스",
    position: "백엔드 개발자",
    source: "사람인",
    steps: [["applied", -9]],
  },
  {
    company: "별빛게임즈",
    position: "게임 서버 개발자",
    source: "원티드",
    steps: [["applied", -3]],
    events: [["deadline", "포트폴리오 추가 제출", 1, null, false]],
  },
  {
    company: "한결클라우드",
    position: "DevOps 엔지니어",
    source: "리멤버",
    steps: [["applied", -1]],
  },
  {
    company: "푸른교육",
    position: "프론트엔드 개발자",
    source: "사람인",
    memo: "직무 적합도 문제로 탈락. 피드백 요청함.",
    steps: [["applied", -80], ["document_passed", -72], ["interview", -60], ["rejected", -52, "2차 면접 탈락"]],
    events: [["interview", "1차 면접", -60, "10:00", true], ["interview", "2차 면접", -54, "14:00", true]],
  },
  {
    company: "모아핀테크",
    position: "백엔드 개발자",
    source: "원티드",
    steps: [["applied", -50], ["rejected", -41, "서류 탈락"]],
  },
  {
    company: "이음물류",
    position: "서버 개발자",
    source: "지인 추천",
    memo: "다른 전형 진행 중이라 일단 멈춤.",
    steps: [["applied", -28], ["document_passed", -18], ["on_hold", -8, "일정이 겹쳐 보류"]],
  },
  {
    company: "가온AI",
    position: "ML 플랫폼 엔지니어",
    source: "리멤버",
    steps: [["applied", -58], ["document_passed", -49], ["interview", -42], ["final", -35], ["rejected", -30, "최종 탈락"]],
    events: [["interview", "기술 면접", -42, "15:00", true], ["interview", "최종 면접", -35, "11:00", true]],
  },
  {
    company: "단비미디어",
    position: "백엔드 개발자",
    source: null,
    memo: "다음 달 공고 열리면 지원.",
    steps: [["interested", -5]],
    events: [["deadline", "공고 마감 확인", 10, null, false]],
  },
  {
    company: "솔빛보안",
    position: "보안 플랫폼 개발자",
    source: null,
    steps: [["interested", -2]],
  },
];

export type DemoApplication = {
  key: string;
  company: string;
  position: string;
  source: string | null;
  memo: string | null;
  status: ApplicationStatus;
  appliedAt: string | null;
  createdAt: string; // ISO
  updatedAt: string; // ISO
};
export type DemoChange = {
  key: string;
  fromStatus: ApplicationStatus | null;
  toStatus: ApplicationStatus;
  changedOn: string;
  changedAt: string; // ISO (이력 순서용)
  note: string | null;
};
export type DemoEvent = {
  key: string;
  kind: EventKind;
  title: string;
  startsAt: string; // ISO
  allDay: boolean;
  done: boolean;
};
export type DemoSeed = { applications: DemoApplication[]; changes: DemoChange[]; events: DemoEvent[] };

/** 오늘(YYYY-MM-DD, 한국 날짜) 기준 예시 데이터 */
export function buildDemoSeed(today: string): DemoSeed {
  const seed: DemoSeed = { applications: [], changes: [], events: [] };
  SPECS.forEach((spec, i) => {
    const key = `a${i}`;
    const steps = spec.steps.map(([status, offset, note]) => ({ status, ymd: addDays(today, offset), note: note ?? null }));
    const last = steps[steps.length - 1];
    // 지원일 = 지원 이후 단계로 처음 넘어간 날 (관심에 머물면 null)
    const appliedAt = last.status === "interested" ? null : (steps.find((s) => s.status !== "interested")?.ymd ?? null);
    // 같은 날 여러 번 바뀌어도 순서가 유지되도록 기록 시각을 1분씩 늘린다
    const at = (ymd: string, n: number) => new Date(seoulDateTime(ymd, "09:00").getTime() + n * 60_000).toISOString();

    seed.applications.push({
      key,
      company: spec.company,
      position: spec.position,
      source: spec.source,
      memo: spec.memo ?? null,
      status: last.status,
      appliedAt,
      createdAt: at(steps[0].ymd, 0),
      updatedAt: at(last.ymd, steps.length),
    });
    steps.forEach((s, n) => {
      seed.changes.push({
        key,
        fromStatus: n === 0 ? null : steps[n - 1].status,
        toStatus: s.status,
        changedOn: s.ymd,
        changedAt: at(s.ymd, n),
        note: s.note,
      });
    });
    for (const [kind, title, offset, time, done] of spec.events ?? []) {
      const ymd = addDays(today, offset);
      seed.events.push({
        key,
        kind,
        title,
        startsAt: seoulDateTime(ymd, time ?? "00:00").toISOString(),
        allDay: time === null,
        done,
      });
    }
  });
  return seed;
}
