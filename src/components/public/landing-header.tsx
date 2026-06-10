import Link from 'next/link';

export function LandingHeader() {
  return (
    <header
      className="sticky top-0 z-30"
      style={{
        backdropFilter: 'blur(12px)',
        background: 'rgba(255,255,255,.80)',
        borderBottom: '1px solid var(--site-line)',
      }}
    >
      <div className="wrap flex items-center justify-between" style={{height: '64px'}}>
        <Link href="/" aria-label="flori 홈으로 이동" className="flex items-center" style={{gap: '8px'}}>
          <svg viewBox="0 0 100 100" width={30} height={30} aria-hidden="true">
            <defs>
              <path
                id="land-petal"
                d="M50 50 C 42 44 39 27 49 15 C 53 11 60 14 60 22 C 60 35 55 44 50 50 Z"
              />
            </defs>
            <g transform="translate(0 3.5)">
              <use href="#land-petal" fill="#A85475" />
              <use href="#land-petal" transform="rotate(72 50 50)" fill="#E0739A" />
              <use href="#land-petal" transform="rotate(144 50 50)" fill="#A85475" />
              <use href="#land-petal" transform="rotate(216 50 50)" fill="#E0739A" />
              <use href="#land-petal" transform="rotate(288 50 50)" fill="#8E3F5F" />
              <circle cx="50" cy="50" r="6" fill="#ffffff" />
              <circle cx="50" cy="50" r="3.2" fill="#A85475" />
            </g>
          </svg>
          <span
            className="font-display"
            style={{fontSize: '30px', fontWeight: 600, fontVariantLigatures: 'none', letterSpacing: '0.2rem'}}
          >
            flori<span style={{color: 'var(--site-accent)'}}>.</span>
          </span>
        </Link>
        {/* 로그인/서비스 바로가기는 homepage 프로젝트 이관 후 추가 예정 — 현재는 앵커 링크만 */}
        <nav className="flex items-center" style={{gap: '28px'}}>
          <a
            href="#features"
            className="hidden md:inline"
            style={{fontSize: '14px', color: 'var(--site-ink-soft)', textDecoration: 'none'}}
          >
            기능
          </a>
          <a
            href="#faq"
            className="hidden md:inline"
            style={{fontSize: '14px', color: 'var(--site-ink-soft)', textDecoration: 'none'}}
          >
            자주 묻는 질문
          </a>
        </nav>
      </div>
    </header>
  );
}
