import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond } from "next/font/google";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { ServiceWorkerRegister } from "@/components/sw-register";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-cormorant",
  display: "swap",
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
    { media: "(prefers-color-scheme: dark)", color: "#1c1819" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning className={cormorant.variable}>
      <head>
        <link
          rel="stylesheet"
          as="style"
          crossOrigin="anonymous"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css"
        />
      </head>
      <body className="antialiased">
        <ThemeProvider>
          <TooltipProvider delayDuration={0}>
            {children}
          </TooltipProvider>
          <Toaster position="bottom-center" richColors duration={2000} />
          <ServiceWorkerRegister />
        </ThemeProvider>
      </body>
    </html>
  );
}
