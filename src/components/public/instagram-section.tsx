// Feed — Claude Design 구조 그대로.
// 사용자 변경: 6장 그리드, @hazel.gilum.

import Image from 'next/image';
import {HAZEL_LINKS} from '@/lib/public-config';

type FeedItem = {
  src: string;
  alt: string;
};

const FEED_ITEMS: FeedItem[] = [
  {src: '/redesign/feed-1.jpg', alt: '레드 안스리움과 핑크 트로피컬 잎의 부케'},
  {src: '/redesign/feed-2.jpg', alt: '핑크 안스리움과 파스텔 꽃들의 다발'},
  {src: '/redesign/feed-3.jpg', alt: '핑크 히아신스 클로즈업'},
  {src: '/redesign/feed-4.jpg', alt: '산당화 복숭아꽃과 라넌큐러스'},
  {src: '/redesign/feed-5.jpg', alt: '드라이 플라워와 팜파스 그라스'},
  {src: '/redesign/feed-6.jpg', alt: '플로리스트가 든 라넌큐러스 부케'},
];

export function InstagramSection() {
  return (
    <section
      id="instagram"
      className="border-b border-[color:var(--site-line)]"
      style={{ padding: 'clamp(72px, 10vw, 140px) 0 clamp(96px, 12vw, 168px)' }}
    >
      <div
        className="max-w-[1280px] mx-auto"
        style={{ padding: '0 clamp(20px, 5vw, 80px)' }}
      >
        {/* feed-head */}
        <div
          className="flex items-baseline justify-between flex-wrap"
          style={{ gap: '32px', marginBottom: 'clamp(40px, 5vw, 72px)' }}
        >
          <div className="flex flex-col" style={{ gap: '6px' }}>
            <span
              className="font-sans uppercase"
              style={{
                color: 'var(--site-ink-soft)',
                fontSize: '11px',
                letterSpacing: '0.22em',
                fontWeight: 500,
              }}
            >
              Recent Work
            </span>
            <span
              className="font-display italic"
              style={{
                color: 'var(--site-ink)',
                fontSize: 'clamp(28px, 3.6vw, 44px)',
                fontWeight: 400,
              }}
            >
              <em>@hazel.gilum</em>
            </span>
          </div>
          <span
            className="font-sans uppercase"
            style={{
              color: 'var(--site-muted)',
              fontSize: '11px',
              letterSpacing: '0.2em',
            }}
          >
            Updated weekly
          </span>
        </div>

        {/* 6 tiles — 3×2 desktop, 2×3 mobile */}
        <div
          className="grid grid-cols-2 sm:grid-cols-3"
          style={{ gap: 'clamp(8px, 1.2vw, 16px)' }}
        >
          {FEED_ITEMS.map((item, idx) => (
            <a
              key={item.src}
              href={HAZEL_LINKS.instagram}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`${item.alt} (Instagram)`}
              className="group relative w-full overflow-hidden"
              style={{
                aspectRatio: '1 / 1.05',
                // rgba fallback for Safari < 16.4 (#2D2418 8% over #FAF7EF)
                background: 'rgba(45, 36, 24, 0.08)',
              }}
            >
              <Image
                src={item.src}
                alt={item.alt}
                fill
                sizes="(min-width: 640px) 33vw, 50vw"
                className="object-cover transition-[transform,filter] duration-700 group-hover:scale-[1.04]"
                style={{ filter: 'saturate(1.02)' }}
                quality={84}
                priority={idx < 2}
                loading={idx < 2 ? undefined : 'lazy'}
              />
              <span
                aria-hidden
                className="absolute inset-0 ring-1 ring-inset ring-black/[0.04] pointer-events-none"
              />
            </a>
          ))}
        </div>

        {/* feed-cta */}
        <div className="flex justify-center" style={{ marginTop: 'clamp(40px, 5vw, 64px)' }}>
          <a
            href={HAZEL_LINKS.instagram}
            target="_blank"
            rel="noopener noreferrer"
            className="font-display italic transition-colors"
            style={{
              color: 'var(--site-accent)',
              fontSize: 'clamp(18px, 1.8vw, 22px)',
              // rgba fallback for Safari < 16.4
              borderBottom: '1px solid rgba(110, 116, 87, 0.5)',
              paddingBottom: '4px',
            }}
          >
            Follow on Instagram <em className="not-italic">→</em>
          </a>
        </div>
      </div>
    </section>
  );
}
