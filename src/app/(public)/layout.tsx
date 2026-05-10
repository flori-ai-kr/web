import type {Metadata} from 'next';
import {Cormorant_Garamond, Noto_Serif_KR} from 'next/font/google';
import {PublicHeader} from '@/components/public/header';
import {PublicFooter} from '@/components/public/footer';
import {HAZEL_BUSINESS, HAZEL_LINKS, HAZEL_SEO} from '@/lib/public-config';

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

// 운영 도메인은 NEXT_PUBLIC_SITE_URL 환경변수로 주입 (Vercel 등). 미설정 시 임시 placeholder.
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://hazel.flowershop.example';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: HAZEL_SEO.title,
  description: HAZEL_SEO.description,
  openGraph: {
    title: HAZEL_SEO.title,
    description: HAZEL_SEO.description,
    locale: 'ko_KR',
    type: 'website',
    images: [{url: HAZEL_SEO.ogImage, width: 626, height: 758, alt: 'hazel flower studio'}],
  },
  twitter: {
    card: 'summary_large_image',
    title: HAZEL_SEO.title,
    description: HAZEL_SEO.description,
    images: [HAZEL_SEO.ogImage],
  },
};

// FlowerStore JSON-LD — 검색엔진의 LocalBusiness 패널에 노출되는 구조화 데이터.
function buildJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'FlowerStore',
    name: HAZEL_BUSINESS.legalName,
    image: `${SITE_URL}${HAZEL_SEO.ogImage}`,
    url: SITE_URL,
    telephone: HAZEL_BUSINESS.phone,
    address: {
      '@type': 'PostalAddress',
      streetAddress: '삼양로9길 14 1층',
      addressLocality: '서울 성북구',
      addressCountry: 'KR',
    },
    openingHoursSpecification: HAZEL_BUSINESS.hours.map((h) => {
      const dayMap: Record<string, string> = {
        mon: 'Monday',
        tue: 'Tuesday',
        wed: 'Wednesday',
        thu: 'Thursday',
        fri: 'Friday',
        sat: 'Saturday',
        sun: 'Sunday',
      };
      const [open, close] = h.time.split(' — ');
      return {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: dayMap[h.day],
        opens: open,
        closes: close === '24:00' ? '23:59' : close,
      };
    }),
    sameAs: [HAZEL_LINKS.instagram, HAZEL_LINKS.blog, HAZEL_LINKS.naverPlace],
  };
}

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const jsonLd = buildJsonLd();
  return (
    <div className={`${cormorant.variable} ${notoSerifKr.variable} site-public min-h-screen flex flex-col`}>
      <PublicHeader />
      <main className="flex-1">{children}</main>
      <PublicFooter />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{__html: JSON.stringify(jsonLd)}}
      />
    </div>
  );
}
