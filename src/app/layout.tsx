import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond } from "next/font/google";
import localFont from "next/font/local";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { ServiceWorkerRegister } from "@/components/sw-register";
import { Analytics } from "@/components/analytics";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-cormorant",
  display: "swap",
});

// Pretendard 가변 폰트 self-host (외부 CDN 제거 + next/font의 swap·size-adjust로 레이아웃 시프트 감소).
const pretendard = localFont({
  src: "./fonts/PretendardVariable.woff2",
  variable: "--font-pretendard",
  display: "swap",
  weight: "45 920",
});

export const metadata: Metadata = {
  title: "flori | 꽃에만 집중하세요",
  description: "꽃집 매출, 지출, 고객을 쉽게 관리하세요",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "flori",
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

// theme-color는 viewport로 분리해 라이트/다크 브라우저 크롬 색을 분기한다.
// 라이트=브랜드 Rose, 다크=앱 다크 배경(상태바와 자연스럽게 블렌딩).
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#A85475" },
    { media: "(prefers-color-scheme: dark)", color: "#101317" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning className={`${cormorant.variable} ${pretendard.variable}`}>
      <body className="antialiased">
        <ThemeProvider>
          <TooltipProvider delayDuration={0}>
            {children}
          </TooltipProvider>
          <Toaster position="bottom-center" richColors duration={2000} />
          <ServiceWorkerRegister />
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}
