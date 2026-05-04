import {HAZEL_BUSINESS, HAZEL_LINKS} from '@/lib/public-config';

export function PublicFooter() {
  return (
    <footer className="mt-auto pt-20 pb-10 border-t border-[color:var(--site-pewter)]/20">
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-10 sm:gap-6">
          <div>
            <div
              className="font-serif text-2xl text-[color:var(--site-charcoal)] mb-3"
              style={{ fontWeight: 300, letterSpacing: '0.02em' }}
            >
              hazel
            </div>
            <p className="text-[11px] uppercase tracking-[0.24em] text-[color:var(--site-pewter)]">
              flower studio <span className="text-[color:var(--site-oxblood)] mx-2">·</span> seoul
            </p>
          </div>

          <div className="space-y-2 text-sm text-[color:var(--site-charcoal)]/80">
            <div className="text-[11px] uppercase tracking-[0.24em] text-[color:var(--site-pewter)] mb-2">Visit</div>
            <div>{HAZEL_BUSINESS.addressShort}</div>
            <div>평일 08:00 — 24:00 · 일요일 예약제</div>
            <div className="tabular-nums">
              <a
                href={HAZEL_BUSINESS.phoneHref}
                className="hover:text-[color:var(--site-oxblood)] transition-colors"
              >
                T. {HAZEL_BUSINESS.phone}
              </a>
            </div>
          </div>

          <div className="space-y-2 text-sm">
            <div className="text-[11px] uppercase tracking-[0.24em] text-[color:var(--site-pewter)] mb-2">Connect</div>
            <a
              href={HAZEL_LINKS.instagram}
              target="_blank"
              rel="noopener noreferrer"
              className="block text-[color:var(--site-charcoal)]/80 hover:text-[color:var(--site-oxblood)] transition-colors"
            >
              instagram
            </a>
            <a
              href={HAZEL_LINKS.kakaoChannel}
              target="_blank"
              rel="noopener noreferrer"
              className="block text-[color:var(--site-charcoal)]/80 hover:text-[color:var(--site-oxblood)] transition-colors"
            >
              kakao channel
            </a>
            <a
              href={HAZEL_LINKS.naverPlace}
              target="_blank"
              rel="noopener noreferrer"
              className="block text-[color:var(--site-charcoal)]/80 hover:text-[color:var(--site-oxblood)] transition-colors"
            >
              naver
            </a>
            <a
              href={HAZEL_LINKS.blog}
              target="_blank"
              rel="noopener noreferrer"
              className="block text-[color:var(--site-charcoal)]/80 hover:text-[color:var(--site-oxblood)] transition-colors"
            >
              blog
            </a>
          </div>
        </div>

        <div className="mt-16 pt-8 border-t border-[color:var(--site-pewter)]/15 flex flex-col sm:flex-row justify-between gap-3 text-[11px] uppercase tracking-[0.2em] text-[color:var(--site-pewter)]">
          <span>© 2026 hazel. all rights reserved.</span>
          <span>성북구 · 삼양로9길 14</span>
        </div>
      </div>
    </footer>
  );
}
