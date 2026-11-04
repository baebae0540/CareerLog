import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CareerLog",
  description: "나의 이직 활동 기록",
  robots: { index: false, follow: false }, // 개인용이라 검색 노출 안 함
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
