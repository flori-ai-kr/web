import Link from 'next/link';

export function PublicHeader() {
  return (
    <header
      className="sticky top-0 z-30 border-b border-[color:var(--site-line)]"
      style={{
        padding: '18px 0',
        // rgba fallback for Safari < 16.4 (color-mix not supported)
        backgroundColor: 'rgba(250, 247, 239, 0.88)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
      }}
    >
      <div
        className="max-w-[1280px] mx-auto flex items-baseline justify-between"
        style={{ padding: '0 clamp(20px, 5vw, 80px)' }}
      >
        <Link
          href="/"
          aria-label="hazel 홈으로 이동"
          className="font-display text-[28px] leading-none text-[color:var(--site-ink)]"
          style={{ fontWeight: 500, letterSpacing: '-0.015em' }}
        >
          Hazel<span className="text-[color:var(--site-accent)]">.</span>
        </Link>
      </div>
    </header>
  );
}
