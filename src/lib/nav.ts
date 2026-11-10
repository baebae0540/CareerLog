// 헤더 메뉴. 주소로 지금 보고 있는 메뉴를 고른다 (순수 함수, 테스트 있음).
export const NAV_ITEMS = [
  { key: "applications", href: "/", label: "지원 목록" },
  { key: "week", href: "/week", label: "주간" },
  { key: "month", href: "/month", label: "월간" },
  { key: "stats", href: "/stats", label: "통계" },
] as const;

export type NavKey = (typeof NAV_ITEMS)[number]["key"];

const under = (pathname: string, base: string) => pathname === base || pathname.startsWith(`${base}/`);

export function activeNav(pathname: string): NavKey | null {
  if (pathname === "/" || under(pathname, "/applications")) return "applications";
  if (under(pathname, "/week")) return "week";
  if (under(pathname, "/month")) return "month";
  if (under(pathname, "/stats")) return "stats";
  return null;
}
