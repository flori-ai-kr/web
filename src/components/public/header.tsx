import Link from 'next/link';

const NAV_ITEMS = [
  { href: '#about', label: 'About' },
  { href: '#collection', label: 'Collection' },
  { href: '#order', label: 'Order' },
  { href: '#location', label: 'Location' },
  { href: '#instagram', label: 'Instagram' },
];

export function PublicHeader() {
  return (
    <header className="sticky top-0 z-40 backdrop-blur-sm bg-[rgba(250,250,247,0.88)] border-b border-[color:var(--site-pewter)]/15">
      <div className="max-w-6xl mx-auto px-6 py-5 flex flex-col items-center gap-3">
        <Link
          href="/"
          aria-label="hazel 홈으로 이동"
          className="font-serif text-[28px] leading-none text-[color:var(--site-charcoal)]"
          style={{ fontWeight: 300, letterSpacing: '0.02em' }}
        >
          hazel
        </Link>
        <nav aria-label="주요 섹션" className="flex gap-5 sm:gap-7 text-[11px] uppercase tracking-[0.24em] text-[color:var(--site-pewter)]">
          {NAV_ITEMS.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="transition-colors hover:text-[color:var(--site-charcoal)]"
            >
              {item.label}
            </a>
          ))}
        </nav>
      </div>
    </header>
  );
}
