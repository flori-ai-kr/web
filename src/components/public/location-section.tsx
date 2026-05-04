import {HAZEL_BUSINESS, HAZEL_LINKS} from '@/lib/public-config';

export function LocationSection() {
  return (
    <section
      id="location"
      className="bg-[color:var(--site-charcoal)] text-[color:var(--site-ivory)] scroll-mt-24"
    >
      <div className="max-w-6xl mx-auto px-6 py-24 sm:py-32 lg:py-40 grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-20">
        {/* Left: address */}
        <div className="lg:col-span-7 space-y-12">
          <div>
            <p className="text-[11px] uppercase tracking-[0.3em] mb-6" style={{ color: 'var(--site-oxblood-light)' }}>
              Location
            </p>
            <h2
              className="font-serif text-[40px] sm:text-[56px] leading-[1.08] mb-8"
              style={{ fontWeight: 300, letterSpacing: '-0.015em' }}
            >
              find us here.
            </h2>
          </div>

          <address className="not-italic space-y-2">
            <div className="font-serif text-2xl sm:text-3xl leading-tight" style={{ fontWeight: 400 }}>
              {HAZEL_BUSINESS.address}
            </div>
            <div className="text-lg sm:text-xl leading-tight text-[color:var(--site-ivory)]/60 font-light">
              seongbuk-gu, seoul
            </div>
            <div className="pt-3 text-[15px] text-[color:var(--site-ivory)]/75 font-light tabular-nums">
              T.{' '}
              <a
                href={HAZEL_BUSINESS.phoneHref}
                className="hover:text-[color:var(--site-ivory)] transition-colors"
              >
                {HAZEL_BUSINESS.phone}
              </a>
            </div>
          </address>

          <div className="w-16 h-px bg-[color:var(--site-ivory)]/25" />

          <div>
            <p className="text-[11px] uppercase tracking-[0.3em] text-[color:var(--site-ivory)]/60 mb-5">
              Hours
            </p>
            <dl className="space-y-3 text-[15px]">
              {HAZEL_BUSINESS.hours.map((h) => (
                <div
                  key={h.day}
                  className="flex justify-between items-baseline gap-6 pb-3 border-b border-[color:var(--site-ivory)]/10 last:border-b-0"
                >
                  <dt className="text-[color:var(--site-ivory)]/75 font-light w-12">{h.label}</dt>
                  <dd className="font-serif flex items-center gap-3" style={{ fontWeight: 400 }}>
                    <span className="tabular-nums">{h.time}</span>
                    {h.byAppointment && (
                      <span
                        className="text-[10px] uppercase tracking-[0.22em] px-2 py-0.5 border"
                        style={{
                          color: 'var(--site-oxblood-soft)',
                          borderColor: 'color-mix(in srgb, var(--site-oxblood-soft) 40%, transparent)',
                        }}
                      >
                        예약제
                      </span>
                    )}
                  </dd>
                </div>
              ))}
            </dl>
            <p className="mt-5 text-[12px] italic text-[color:var(--site-ivory)]/55 font-light leading-relaxed">
              {HAZEL_BUSINESS.hoursNote}
            </p>
          </div>

          <a
            href={HAZEL_LINKS.naverPlace}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-3 text-[11px] uppercase tracking-[0.28em] text-[color:var(--site-ivory)]/80 hover:text-[color:var(--site-ivory)] transition-colors"
          >
            <span>view on naver map</span>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <path d="M2 7 L12 7 M8 3 L12 7 L8 11" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </a>
        </div>

        {/* Right: map placeholder */}
        <div className="lg:col-span-5">
          <a
            href={HAZEL_LINKS.naverPlace}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="네이버 지도에서 헤이즐 위치 보기 (새 탭)"
            className="relative aspect-[4/5] overflow-hidden border border-[color:var(--site-ivory)]/15 bg-[color:var(--site-ivory)]/5 hover:bg-[color:var(--site-ivory)]/10 transition-colors flex items-center justify-center"
          >
            <div className="text-center">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" className="mx-auto mb-4 text-[color:var(--site-ivory)]/40" aria-hidden="true">
                <path d="M12 21s-7-6.5-7-12a7 7 0 1 1 14 0c0 5.5-7 12-7 12z" stroke="currentColor" strokeWidth="1" strokeLinejoin="round"/>
                <circle cx="12" cy="9" r="2.5" stroke="currentColor" strokeWidth="1"/>
              </svg>
              <p className="text-[10px] uppercase tracking-[0.3em] text-[color:var(--site-ivory)]/50">
                naver map
              </p>
            </div>
          </a>
          <p className="mt-4 text-[11px] uppercase tracking-[0.24em] text-[color:var(--site-ivory)]/50">
            parking · 인근 공영 주차장 이용
          </p>
        </div>
      </div>
    </section>
  );
}
