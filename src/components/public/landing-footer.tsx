import Link from 'next/link';

export function LandingFooter() {
  return (
    <footer
      style={{
        padding: 'clamp(44px,6vw,64px) 0 40px',
        background: '#fff',
        borderTop: '1px solid var(--site-line)',
      }}
    >
      <div
        className="wrap"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          gap: '32px',
          flexWrap: 'wrap',
        }}
      >
        <div>
          <div
            className="font-display"
            style={{fontSize: '40px', fontWeight: 600, letterSpacing: '-.01em'}}
          >
            flori<span style={{color: 'var(--site-accent)'}}>.</span>
          </div>
          <p style={{fontSize: '13px', color: 'var(--site-ink-soft)', margin: '6px 0 0'}}>
            꽃집 사장님을 위한 운영 앱
          </p>
        </div>
        <div style={{textAlign: 'right', fontSize: '13px', color: 'var(--site-ink-soft)', lineHeight: 2}}>
          <Link
            href="/policy/privacy"
            style={{color: 'var(--site-ink-soft)', textDecoration: 'none'}}
          >
            개인정보처리방침
          </Link>
          <span style={{color: 'var(--site-muted)', margin: '0 8px'}}>·</span>
          <Link
            href="/policy/terms"
            style={{color: 'var(--site-ink-soft)', textDecoration: 'none'}}
          >
            이용약관
          </Link>
          <br />
          <span style={{fontSize: '12px', color: 'var(--site-muted)'}}>
            © 2026 flori. All rights reserved.
          </span>
        </div>
      </div>
    </footer>
  );
}
