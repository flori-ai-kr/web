import Link from 'next/link';
import {FLORI_LEGAL} from '@/lib/legal-config';

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
            꽃집 사장님을 위한 운영 서비스
          </p>
          {/* 운영자·문의 표기 — 값은 lib/legal-config.ts SSOT.
              사업자등록 후 상호·사업자등록번호·통신판매업신고·주소를 여기에 추가한다. */}
          <p style={{fontSize: '12px', color: 'var(--site-muted)', margin: '14px 0 0', lineHeight: 1.9}}>
            대표 {FLORI_LEGAL.ceo} · 문의{' '}
            <a
              href={`mailto:${FLORI_LEGAL.contactEmail}`}
              style={{color: 'var(--site-muted)', textDecoration: 'underline', textUnderlineOffset: '3px'}}
            >
              {FLORI_LEGAL.contactEmail}
            </a>
          </p>
        </div>
        {/* 데스크탑은 우측 정렬, 모바일(줄바꿈 시)은 좌측 정렬 — globals.css .footer-links */}
        <div className="footer-links" style={{fontSize: '13px', color: 'var(--site-ink-soft)', lineHeight: 2}}>
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
