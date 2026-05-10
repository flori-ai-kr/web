// Footer — Claude Design 구조 그대로.
// 헤이즐 실제 정보로만 치환 (주소·시간·핸들).

import {HAZEL_BUSINESS, HAZEL_LINKS} from '@/lib/public-config';

const HOURS_ROWS = [
  { label: 'Mon — Wed · Sat', time: '08:00 — 23:30' },
  { label: 'Thu — Fri', time: '08:00 — 24:00' },
  { label: 'Sun', time: 'By appointment' },
];

export function PublicFooter() {
  return (
    <footer
      className="mt-auto"
      style={{
        padding: 'clamp(72px, 10vw, 132px) 0 clamp(40px, 5vw, 64px)',
        background: 'var(--site-paper-soft)',
      }}
    >
      <div
        className="max-w-[1280px] mx-auto"
        style={{ padding: '0 clamp(20px, 5vw, 80px)' }}
      >
        {/* footer-grid: Order | Visit + Hours */}
        <div
          className="grid grid-cols-1 md:grid-cols-[1.1fr_0.9fr]"
          style={{ gap: 'clamp(48px, 7vw, 112px)', marginBottom: 'clamp(56px, 8vw, 96px)' }}
        >
          {/* === Order === */}
          <div>
            <h4
              className="font-sans uppercase"
              style={{
                color: 'var(--site-muted)',
                fontSize: '11px',
                letterSpacing: '0.22em',
                fontWeight: 500,
                margin: '0 0 18px',
              }}
            >
              Order
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3" style={{ gap: '10px' }}>
              <OrderButton ch="CH 01" label="KakaoTalk" href={HAZEL_LINKS.kakaoChannel} />
              <OrderButton ch="CH 02" label="Naver Smart" href={HAZEL_LINKS.naverPlace} />
              <OrderButton ch="CH 03" label="Phone" href={HAZEL_BUSINESS.phoneHref} />
            </div>

            <div
              style={{
                marginTop: '24px',
                padding: '14px 16px',
                borderLeft: '2px solid var(--site-accent)',
                // rgba fallback (Safari < 16.4)
                background: 'rgba(110, 116, 87, 0.06)',
                fontFamily: 'var(--font-serif-kr), "Noto Serif KR", serif',
                fontSize: '14px',
                lineHeight: 1.7,
                color: 'var(--site-ink-soft)',
              }}
            >
              1인 운영 스튜디오로, 사전 예약을 권장드립니다.
              특정 색감은 최소 3–4일 전, 시즌·이벤트 문의는 1주 전에 연락 부탁드립니다.
            </div>
          </div>

          {/* === Visit + Hours === */}
          <div>
            <h4
              className="font-sans uppercase"
              style={{
                color: 'var(--site-muted)',
                fontSize: '11px',
                letterSpacing: '0.22em',
                fontWeight: 500,
                margin: '0 0 18px',
              }}
            >
              Visit
            </h4>
            <div
              style={{
                fontFamily: 'var(--font-serif-kr), "Noto Serif KR", serif',
                fontSize: '17px',
                lineHeight: 1.7,
              }}
            >
              <span style={{ display: 'block', color: 'var(--site-ink)' }}>
                {HAZEL_BUSINESS.address}
              </span>
              <span
                className="font-sans"
                style={{
                  display: 'block',
                  fontSize: '13px',
                  color: 'var(--site-muted)',
                  marginTop: '4px',
                  letterSpacing: '0.04em',
                }}
              >
                14, Samyang-ro 9-gil, Seongbuk-gu, Seoul · Gileum Stn. 5min walk
              </span>
            </div>
            <a
              href={HAZEL_LINKS.naverPlace}
              target="_blank"
              rel="noopener noreferrer"
              className="font-sans inline-block transition-colors"
              style={{
                marginTop: '14px',
                fontSize: '13px',
                color: 'var(--site-accent)',
                // rgba fallback for Safari < 16.4
              borderBottom: '1px solid rgba(110, 116, 87, 0.5)',
                paddingBottom: '2px',
              }}
            >
              View on map →
            </a>

            <h4
              className="font-sans uppercase"
              style={{
                color: 'var(--site-muted)',
                fontSize: '11px',
                letterSpacing: '0.22em',
                fontWeight: 500,
                margin: '40px 0 18px',
              }}
            >
              Hours
            </h4>
            <table
              className="w-full font-sans"
              style={{
                borderCollapse: 'collapse',
                fontSize: '14px',
              }}
            >
              <tbody>
                {HOURS_ROWS.map((row) => (
                  <tr key={row.label}>
                    <td
                      className="uppercase"
                      style={{
                        padding: '9px 0',
                        borderBottom: '1px solid var(--site-line)',
                        verticalAlign: 'baseline',
                        width: '7em',
                        color: 'var(--site-ink-soft)',
                        fontSize: '11px',
                        letterSpacing: '0.2em',
                      }}
                    >
                      {row.label}
                    </td>
                    <td
                      className="text-right tabular-nums"
                      style={{
                        padding: '9px 0',
                        borderBottom: '1px solid var(--site-line)',
                        verticalAlign: 'baseline',
                      }}
                    >
                      {row.time}
                    </td>
                  </tr>
                ))}
                <tr>
                  <td
                    colSpan={2}
                    className="font-display italic"
                    style={{
                      paddingTop: '14px',
                      color: 'var(--site-ink-soft)',
                      fontSize: '16px',
                    }}
                  >
                    — {HAZEL_BUSINESS.hoursNote}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* sign-off */}
        <div
          className="grid items-end"
          style={{
            gridTemplateColumns: '1fr auto',
            gap: 'var(--gap-m, 32px)',
            paddingTop: 'clamp(40px, 6vw, 72px)',
            borderTop: '1px solid var(--site-line)',
          }}
        >
          <div
            className="font-display"
            style={{
              fontSize: 'clamp(56px, 12vw, 140px)',
              fontWeight: 400,
              letterSpacing: '-0.03em',
              lineHeight: 0.9,
              color: 'var(--site-ink)',
            }}
          >
            Hazel<span style={{ color: 'var(--site-accent)' }}>.</span>
          </div>
          <div
            className="font-sans text-right"
            style={{
              fontSize: '11px',
              lineHeight: 1.7,
              color: 'var(--site-muted)',
              letterSpacing: '0.02em',
            }}
          >
            Hazel Flower Studio
            <br />
            대표 · Florist Hazel
            <br />
            <a
              href={HAZEL_LINKS.instagram}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[color:var(--site-accent)] transition-colors"
            >
              {HAZEL_LINKS.instagramHandle}
            </a>
            {' · '}
            <a
              href={HAZEL_BUSINESS.phoneHref}
              className="hover:text-[color:var(--site-accent)] transition-colors tabular-nums"
            >
              {HAZEL_BUSINESS.phone}
            </a>
            <br />
            © 2026 Hazel. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  );
}

function OrderButton({ ch, label, href }: { ch: string; label: string; href: string }) {
  const isExternal = href.startsWith('http');
  return (
    <a
      href={href}
      {...(isExternal ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      className="btn-order group flex flex-col justify-between font-sans transition-colors text-left"
      style={{
        minHeight: '92px',
        padding: '16px 18px',
        background: 'transparent',
        border: '1px solid var(--site-ink)',
        color: 'var(--site-ink)',
      }}
    >
      <span
        className="uppercase opacity-70 group-hover:opacity-100 transition-opacity"
        style={{ fontSize: '11px', letterSpacing: '0.22em' }}
      >
        {ch}
      </span>
      <span
        className="font-display italic"
        style={{
          fontSize: '22px',
          letterSpacing: '-0.01em',
          marginTop: 'auto',
          fontWeight: 400,
        }}
      >
        {label}
      </span>
    </a>
  );
}
