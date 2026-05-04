import Image from 'next/image';
import {HAZEL_LINKS} from '@/lib/public-config';

// 헤이즐 인스타 작업 컷. v2에서 인스타 그래프 API 또는 instagram_posts 공유 테이블 재활용 검토.
const FEED_ITEMS = [
  '/instagram/0.png',
  '/instagram/1.png',
  '/instagram/2.png',
  '/instagram/3.png',
  '/instagram/4.png',
  '/instagram/5.png',
];

export function InstagramSection() {
  return (
    <section
      id="instagram"
      className="border-t border-[color:var(--site-pewter)]/15 scroll-mt-24"
    >
      <div className="max-w-6xl mx-auto px-6 py-24 sm:py-32 lg:py-40">
        {/* Header */}
        <div className="mb-14 lg:mb-16 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6">
          <div>
            <p className="text-[11px] uppercase tracking-[0.3em] text-[color:var(--site-oxblood)] mb-6">
              Instagram
            </p>
            <h2
              className="font-serif text-[40px] sm:text-[56px] leading-[1.08] text-[color:var(--site-charcoal)]"
              style={{ fontWeight: 300, letterSpacing: '-0.015em' }}
            >
              @hazel<span className="text-[color:var(--site-pewter)]">.gilum</span>
            </h2>
          </div>
          <a
            href={HAZEL_LINKS.instagram}
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex items-center gap-3 text-[11px] uppercase tracking-[0.28em] text-[color:var(--site-charcoal)] hover:text-[color:var(--site-oxblood)] transition-colors"
          >
            <span>follow on instagram</span>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true" className="transition-transform group-hover:translate-x-0.5">
              <path d="M2 7 L12 7 M8 3 L12 7 L8 11" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </a>
        </div>

        {/* Feed grid — 6 squares */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
          {FEED_ITEMS.map((src, idx) => (
            <a
              key={src}
              href={HAZEL_LINKS.instagram}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Instagram 포스트 ${idx + 1} (새 탭)`}
              className="group relative aspect-square overflow-hidden bg-[color:var(--site-parchment)]"
            >
              <Image
                src={src}
                alt=""
                fill
                sizes="(min-width: 1024px) 16vw, (min-width: 640px) 33vw, 50vw"
                className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
              />
              <div className="absolute inset-0 bg-[color:var(--site-charcoal)]/0 group-hover:bg-[color:var(--site-charcoal)]/15 transition-colors" />
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
