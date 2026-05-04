import Image from 'next/image';
import {HAZEL_LINKS} from '@/lib/public-config';

type CollectionItem = {
  src: string;
  alt: string;
  title: string;
  subtitle: string;
};

// 헤이즐 인스타 작업물 무드 컷. v2에서 photo_cards.is_lookbook 연결 예정.
const COLLECTION_ITEMS: CollectionItem[] = [
  {
    src: '/instagram/0.png',
    alt: '헤이즐 플라워 작업 — 1',
    title: 'spring composition',
    subtitle: 'hand-tied',
  },
  {
    src: '/instagram/1.png',
    alt: '헤이즐 플라워 작업 — 2',
    title: 'late summer',
    subtitle: 'bouquet',
  },
  {
    src: '/instagram/2.png',
    alt: '헤이즐 플라워 작업 — 3',
    title: 'autumn letter',
    subtitle: 'centerpiece',
  },
  {
    src: '/instagram/3.png',
    alt: '헤이즐 플라워 작업 — 4',
    title: 'quiet bouquet',
    subtitle: 'seasonal',
  },
  {
    src: '/instagram/4.png',
    alt: '헤이즐 플라워 작업 — 5',
    title: 'wrapped gift',
    subtitle: 'gift bouquet',
  },
  {
    src: '/instagram/5.png',
    alt: '헤이즐 플라워 작업 — 6',
    title: 'studio still life',
    subtitle: 'seasonal',
  },
];

export function CollectionSection() {
  return (
    <section
      id="collection"
      className="bg-[color:var(--site-parchment)] border-t border-[color:var(--site-pewter)]/15 scroll-mt-24"
    >
      <div className="max-w-6xl mx-auto px-6 py-24 sm:py-32 lg:py-40">
        {/* Section header */}
        <div className="mb-16 lg:mb-20 text-center">
          <p className="text-[11px] uppercase tracking-[0.3em] text-[color:var(--site-oxblood)] mb-6">
            Collection
          </p>
          <h2
            className="font-serif text-[40px] sm:text-[56px] leading-[1.08] text-[color:var(--site-charcoal)] max-w-2xl mx-auto"
            style={{ fontWeight: 300, letterSpacing: '-0.015em' }}
          >
            a small lookbook
            <br />
            of recent work.
          </h2>
        </div>

        {/* Editorial grid — asymmetric 2-3 column mix */}
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-4 sm:gap-6 lg:gap-8">
          {COLLECTION_ITEMS.map((item, idx) => {
            const colSpan =
              idx % 5 === 0 ? 'lg:col-span-3'
              : idx % 5 === 1 ? 'lg:col-span-3'
              : 'lg:col-span-2';
            return (
              <figure
                key={item.src}
                className={`group ${colSpan} ${idx === 0 ? 'col-span-2' : ''}`}
              >
                <div className="relative aspect-[4/5] overflow-hidden bg-[color:var(--site-ivory)]">
                  <Image
                    src={item.src}
                    alt={item.alt}
                    fill
                    sizes="(min-width: 1024px) 33vw, 50vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                  />
                </div>
                <figcaption className="mt-3 flex items-baseline justify-between gap-3">
                  <span className="font-serif text-[15px] text-[color:var(--site-charcoal)]" style={{ fontWeight: 400 }}>
                    {item.title}
                  </span>
                  <span className="text-[10px] uppercase tracking-[0.22em] text-[color:var(--site-pewter)]">
                    {item.subtitle}
                  </span>
                </figcaption>
              </figure>
            );
          })}
        </div>

        {/* Footnote */}
        <p className="mt-16 text-center text-[11px] uppercase tracking-[0.3em] text-[color:var(--site-pewter)]">
          <a
            href={HAZEL_LINKS.instagram}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[color:var(--site-charcoal)] hover:text-[color:var(--site-oxblood)] transition-colors"
          >
            more on instagram
          </a>
          <span className="mx-3">·</span>
          <a
            href={HAZEL_LINKS.blog}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[color:var(--site-charcoal)] hover:text-[color:var(--site-oxblood)] transition-colors"
          >
            naver blog
          </a>
        </p>
      </div>
    </section>
  );
}
