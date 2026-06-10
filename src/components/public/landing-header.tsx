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
        <Link
          href="/"
          aria-label="flori 홈으로 이동"
          className="font-display"
          style={{fontSize: '30px', fontWeight: 600, letterSpacing: '-.01em'}}
        >
          flori<span style={{color: 'var(--site-accent)'}}>.</span>
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
