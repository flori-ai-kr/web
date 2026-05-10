// Statement — Claude Design 구조 그대로.
// 사용자 변경: 본문 카피, 자격(Credentials) 강조 블록.

export function StatementSection() {
  return (
    <section
      id="story"
      className="border-b border-[color:var(--site-line)]"
      style={{ padding: 'clamp(96px, 14vw, 200px) 0' }}
    >
      <div
        className="max-w-[1280px] mx-auto flex flex-col items-center text-center"
        style={{
          padding: '0 clamp(20px, 5vw, 80px)',
          gap: 'clamp(28px, 4vw, 56px)',
        }}
      >
        {/* Eyebrow */}
        <div
          className="font-sans uppercase"
          style={{
            color: 'var(--site-ink-soft)',
            fontSize: '11px',
            letterSpacing: '0.22em',
            fontWeight: 500,
          }}
        >
          A note from the studio
        </div>

        {/* Lede (italic accent) */}
        <p
          className="font-display italic"
          style={{
            color: 'var(--site-accent)',
            fontSize: 'clamp(22px, 2.4vw, 30px)',
            fontWeight: 400,
            lineHeight: 1.4,
            margin: 0,
          }}
        >
          계절의 호흡을 한 다발에.
        </p>

        {/* Body — 사용자 카피 */}
        <div
          style={{
            color: 'var(--site-ink)',
            fontFamily: 'var(--font-serif-kr), "Noto Serif KR", serif',
            fontSize: 'clamp(16px, 1.8vw, 22px)',
            fontWeight: 300,
            lineHeight: 1.9,
            maxWidth: '32ch',
            wordBreak: 'keep-all',
          }}
        >
          <p style={{ margin: '0 0 1.4em' }}>
            계절의 작은 숨결을 모아<br />
            한 송이 한 송이 손으로 엮습니다.
          </p>
          <p style={{ margin: '0 0 1.4em' }}>
            매일 피고 지는 자연의 흐름처럼<br />
            빛과 향기가 다른 그날의 꽃을
          </p>
          <p style={{ margin: 0 }}>헤이즐은 조용히 기록합니다.</p>
        </div>

        {/* Sign */}
        <div
          className="flex flex-col items-center"
          style={{ marginTop: 'clamp(24px, 4vw, 48px)', gap: '4px' }}
        >
          <span
            className="font-display italic"
            style={{ color: 'var(--site-ink)', fontSize: '22px' }}
          >
            — florist hazel
          </span>
          <span
            className="font-sans uppercase"
            style={{
              color: 'var(--site-muted)',
              fontSize: '11px',
              letterSpacing: '0.2em',
            }}
          >
            Founder · Florist
          </span>
        </div>

        {/* === Credentials — 강조 블록 (사용자 요청) === */}
        <div
          className="w-full"
          style={{
            marginTop: 'clamp(48px, 7vw, 88px)',
            paddingTop: 'clamp(40px, 5vw, 64px)',
            paddingBottom: 'clamp(40px, 5vw, 64px)',
            borderTop: '1px solid var(--site-line)',
            borderBottom: '1px solid var(--site-line)',
            maxWidth: '760px',
          }}
        >
          <p
            className="font-sans uppercase"
            style={{
              color: 'var(--site-accent)',
              fontSize: '11px',
              letterSpacing: '0.32em',
              fontWeight: 500,
              marginBottom: '36px',
            }}
          >
            ─ Credentials ─
          </p>

          <div className="flex flex-col items-center" style={{ gap: '28px' }}>
            <div className="text-center">
              <p
                className="font-display italic"
                style={{
                  color: 'var(--site-ink)',
                  fontSize: 'clamp(22px, 2.6vw, 30px)',
                  lineHeight: 1.3,
                  margin: 0,
                  letterSpacing: '0.005em',
                }}
              >
                Texas A&amp;M Benz School
              </p>
              <p
                className="font-sans uppercase"
                style={{
                  color: 'var(--site-muted)',
                  fontSize: '11px',
                  letterSpacing: '0.24em',
                  marginTop: '8px',
                }}
              >
                of Floral Design — Graduate
              </p>
            </div>

            <span
              aria-hidden
              className="block"
              style={{ width: '32px', height: '1px', background: 'var(--site-line)' }}
            />

            <div className="flex flex-col sm:flex-row items-center justify-center" style={{ gap: 'clamp(20px, 4vw, 56px)' }}>
              <div className="text-center">
                <p
                  style={{
                    color: 'var(--site-ink)',
                    fontFamily: 'var(--font-serif-kr), "Noto Serif KR", serif',
                    fontSize: 'clamp(15px, 1.6vw, 18px)',
                    fontWeight: 400,
                    margin: 0,
                  }}
                >
                  화훼장식 산업기사
                </p>
                <p
                  className="font-sans uppercase"
                  style={{
                    color: 'var(--site-muted)',
                    fontSize: '10px',
                    letterSpacing: '0.24em',
                    marginTop: '6px',
                  }}
                >
                  National Certificate
                </p>
              </div>

              <span
                aria-hidden
                className="hidden sm:block"
                style={{ width: '1px', height: '24px', background: 'var(--site-line)' }}
              />

              <div className="text-center">
                <p
                  style={{
                    color: 'var(--site-ink)',
                    fontFamily: 'var(--font-serif-kr), "Noto Serif KR", serif',
                    fontSize: 'clamp(15px, 1.6vw, 18px)',
                    fontWeight: 400,
                    margin: 0,
                  }}
                >
                  조형장식가 1급
                </p>
                <p
                  className="font-sans uppercase"
                  style={{
                    color: 'var(--site-muted)',
                    fontSize: '10px',
                    letterSpacing: '0.24em',
                    marginTop: '6px',
                  }}
                >
                  Level 1 Master
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
