import { getImage } from "@/db/queries";
import { parseId } from "@/lib/application-input";
import { getSession } from "@/lib/session";

/** 지원 건 사진을 내려준다. 로그인한 사람만 (proxy만 믿지 않는다). */
export async function GET(_req: Request, ctx: RouteContext<"/applications/[id]/images/[imageId]">) {
  const session = await getSession();
  if (!session) return new Response("로그인이 필요합니다.", { status: 401 });

  const params = await ctx.params;
  const applicationId = parseId(params.id);
  const imageId = parseId(params.imageId);
  const image = applicationId && imageId ? await getImage(session.accountId, applicationId, imageId) : undefined;
  // 다른 계정의 사진도 "없음"으로 (있는지조차 알리지 않는다)
  if (!image) return new Response("사진이 없습니다.", { status: 404 });

  return new Response(new Uint8Array(image.data), {
    headers: {
      "Content-Type": image.mime,
      "Content-Length": String(image.data.length),
      // 사진은 고치지 않고 추가·삭제만 하므로 같은 주소는 늘 같은 내용이다
      "Cache-Control": "private, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
