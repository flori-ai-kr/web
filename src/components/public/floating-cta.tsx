'use client';

import {useEffect, useState} from 'react';
import {HAZEL_BUSINESS, HAZEL_LINKS} from '@/lib/public-config';

export function FloatingCta() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 280);
    onScroll();
    window.addEventListener('scroll', onScroll, {passive: true});
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div
      aria-hidden={!visible}
      // inert: 키보드 포커스(Tab)도 차단 — pointer-events-none로는 부족
      inert={!visible}
      className={`
        lg:hidden fixed right-4 bottom-4 z-50 flex flex-col gap-2 font-sans
        transition-opacity duration-300
        ${visible ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}
      `}
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <a
        href={HAZEL_LINKS.kakaoChannel}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="카카오톡 채널로 주문 문의"
        className="
          inline-flex items-center justify-center
          h-11 px-5 text-[11px] uppercase tracking-[0.22em]
          shadow-md backdrop-blur
          bg-[color:var(--site-paper-soft)]/95 text-[color:var(--site-ink)]
          border border-[color:var(--site-ink)]
          hover:bg-[color:var(--site-ink)] hover:text-[color:var(--site-paper-soft)]
          transition-colors
        "
      >
        kakao
      </a>
      <a
        href={HAZEL_BUSINESS.phoneHref}
        aria-label="전화로 주문 문의"
        className="
          inline-flex items-center justify-center
          h-11 px-5 text-[11px] uppercase tracking-[0.22em]
          shadow-md
          bg-[color:var(--site-ink)] text-[color:var(--site-paper-soft)]
          hover:bg-[color:var(--site-accent)] transition-colors
        "
      >
        call
      </a>
    </div>
  );
}
