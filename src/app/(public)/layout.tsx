import type {Metadata} from 'next';
import {Cormorant_Garamond, Noto_Serif_KR} from 'next/font/google';

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  variable: '--font-display',
  weight: ['300', '400', '500'],
  style: ['normal', 'italic'],
  display: 'swap',
});

// Noto_Serif_KR: korean glyphs are loaded implicitly by next/font/google
// (the 'korean' subset is not a valid value — Korean is the font's primary script)
const notoSerifKr = Noto_Serif_KR({
  subsets: ['latin'],
  variable: '--font-serif-kr',
  weight: ['300', '400', '500'],
  display: 'swap',
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://flori.ai.kr';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: 'flori — 꽃집 사장님을 위한 운영 서비스',
  description: '매출·지출·고객·예약·사진첩까지. 꽃집 운영에 필요한 모든 기록을 flori 하나로.',
  openGraph: {
    title: 'flori — 꽃집 사장님을 위한 운영 서비스',
    description: '꽃집 운영에 필요한 모든 기록을 flori 하나로.',
    locale: 'ko_KR',
    type: 'website',
  },
};

export default function PublicLayout({children}: {children: React.ReactNode}) {
  return (
    <div className={`${cormorant.variable} ${notoSerifKr.variable} site-public min-h-screen flex flex-col`}>
      <main className="flex-1">{children}</main>
    </div>
  );
}
