import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-xl font-bold">찾을 수 없는 페이지입니다</h1>
      <p className="text-zinc-500">삭제되었거나 주소가 잘못되었습니다.</p>
      <Link href="/" className="text-blue-600 hover:underline dark:text-blue-400">
        지원 목록으로
      </Link>
    </main>
  );
}
