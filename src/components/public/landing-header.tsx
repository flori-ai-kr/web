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
        <div
          className="font-display"
          style={{fontSize: '30px', fontWeight: 600, letterSpacing: '-.01em'}}
        >
          flori<span style={{color: 'var(--site-accent)'}}>.</span>
        </div>
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
          <Link href="/login" className="btn-rose" style={{padding: '9px 20px', fontSize: '14px'}}>
            로그인
          </Link>
        </nav>
      </div>
    </header>
  );
}
