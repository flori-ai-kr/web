import Image from 'next/image';

const HERO_IMAGE = '/instagram/0.png';

export function HeroSection() {
  return (
    <section className="relative">
      <div className="max-w-6xl mx-auto px-6 pt-20 pb-16 sm:pt-28 sm:pb-24 lg:pt-36 lg:pb-32 grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-20 items-center">
        {/* Text block */}
        <div className="lg:col-span-7 order-2 lg:order-1">
          <p className="text-[11px] uppercase tracking-[0.3em] text-[color:var(--site-pewter)] mb-8">
            Seoul
          </p>
          <h1
            className="font-serif text-[56px] sm:text-[80px] lg:text-[104px] leading-[0.98] text-[color:var(--site-charcoal)] mb-10"
            style={{ fontWeight: 300, letterSpacing: '-0.02em' }}
          >
            flowers,
            <br />
            <span style={{ color: 'var(--site-oxblood)' }}>quietly</span>
            <br />
            arranged.
          </h1>
          <p className="text-base sm:text-lg text-[color:var(--site-charcoal)]/75 max-w-md leading-[1.8] font-light">
            조용한 손길로 꽃을 엮는,
            <br />
            서울의 작은 플라워 스튜디오.
          </p>
        </div>

        {/* Image block */}
        <div className="lg:col-span-5 order-1 lg:order-2 relative">
          <div className="relative aspect-[4/5] overflow-hidden bg-[color:var(--site-parchment)]">
            <Image
              src={HERO_IMAGE}
              alt="헤이즐 플라워 스튜디오 작업 — 대표 무드"
              fill
              sizes="(min-width: 1024px) 42vw, 100vw"
              className="object-cover"
              priority
            />
          </div>
        </div>
      </div>

      {/* Scroll cue */}
      <div className="text-center pb-14 sm:pb-20">
        <a
          href="#about"
          aria-label="About 섹션으로 스크롤"
          className="inline-flex flex-col items-center gap-3 text-[10px] uppercase tracking-[0.3em] text-[color:var(--site-pewter)] hover:text-[color:var(--site-charcoal)] transition-colors"
        >
          <span>scroll</span>
          <svg width="1" height="32" viewBox="0 0 1 32" fill="none" aria-hidden="true">
            <line x1="0.5" y1="0" x2="0.5" y2="32" stroke="currentColor" strokeWidth="1" />
          </svg>
        </a>
      </div>
    </section>
  );
}
