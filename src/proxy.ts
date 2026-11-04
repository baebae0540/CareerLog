import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth-token";

// 낙관적 검사: 로그인 안 했으면 /login으로 보낸다.
// 실제 보호는 각 페이지·서버 액션의 requireLogin()이 맡는다.
export async function proxy(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const loggedIn = await verifySessionToken(token, process.env.SESSION_SECRET);
  const isLoginPage = request.nextUrl.pathname === "/login";

  if (!loggedIn && !isLoginPage) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  if (loggedIn && isLoginPage) {
    return NextResponse.redirect(new URL("/", request.url));
  }
  return NextResponse.next();
}

export const config = {
  // 정적 파일·이미지·파비콘은 제외
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|svg|ico|webp)$).*)"],
};
