import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "고객 재무관리 시스템",
  description: "고객별 재무상태를 관리하고 분석하는 시스템",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="bg-gray-50 min-h-screen text-gray-900 antialiased">
        {children}
      </body>
    </html>
  );
}
