import {LANDING_FEATURES} from '@/lib/landing-content';

const AUX_CARDS = [
  {icon: '📈', title: '인사이트 · 트렌드', desc: '시즌 트렌드와 인기 작품을 스크랩.'},
  {icon: '📑', title: '엑셀 · PDF 내보내기', desc: '매출·지출을 파일로 정산·보고.'},
  {icon: '📲', title: '폰·PC 어디서나', desc: '어디서 켜도 같은 기록으로 이어서.'},
  {icon: '🔔', title: '푸시 알림', desc: '예약·정산을 놓치지 않게.'},
];

export function LandingFeatures() {
  return (
    <>
      <section id="features" style={{padding: 'clamp(56px,8vw,96px) 0'}}>
        <div className="wrap">
          <div style={{textAlign: 'center', marginBottom: 'clamp(40px,6vw,64px)'}}>
            <div className="eyebrow" style={{marginBottom: '12px'}}>
              Features
            </div>
            <h2
              style={{
                fontSize: 'clamp(28px,4.4vw,46px)',
                fontWeight: 800,
                letterSpacing: '-.03em',
                margin: 0,
              }}
            >
              흩어진 꽃집 살림, 하나로
            </h2>
          </div>

          {LANDING_FEATURES.map((feature, i) => {
            const isReversed = i % 2 === 1;
            return (
              <div
                key={feature.title}
                className="feat-row"
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 'clamp(28px,5vw,64px)',
                  alignItems: 'center',
                  marginBottom: i < LANDING_FEATURES.length - 1 ? 'clamp(48px,7vw,88px)' : 0,
                }}
              >
                {isReversed ? (
                  <>
                    <div
                      className="ph"
                      style={{aspectRatio: '4/3', order: -1}}
                      aria-label={`${feature.title} 화면 캡처 — 준비 중`}
                    >
                      <div className="ico">📷</div>
                      <b>{feature.title} 화면 캡처</b>
                    </div>
                    <FeatureText feature={feature} />
                  </>
                ) : (
                  <>
                    <FeatureText feature={feature} />
                    <div
                      className="ph"
                      style={{aspectRatio: '4/3'}}
                      aria-label={`${feature.title} 화면 캡처 — 준비 중`}
                    >
                      <div className="ico">📷</div>
                      <b>{feature.title} 화면 캡처</b>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* 보조 기능 그리드 */}
      <section
        style={{
          padding: 'clamp(48px,7vw,80px) 0',
          background: '#fff',
          borderTop: '1px solid var(--site-line)',
          borderBottom: '1px solid var(--site-line)',
        }}
      >
        <div className="wrap">
          <div style={{textAlign: 'center', marginBottom: '40px'}}>
            <div className="eyebrow" style={{marginBottom: '12px'}}>
              And more
            </div>
            <h2
              style={{
                fontSize: 'clamp(24px,3.4vw,36px)',
                fontWeight: 800,
                letterSpacing: '-.02em',
                margin: 0,
              }}
            >
              사장님 하루를 가볍게 하는 디테일
            </h2>
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))',
              gap: '14px',
            }}
          >
            {AUX_CARDS.map((card) => (
              <div className="card" key={card.title} style={{padding: '22px'}}>
                <div style={{fontSize: '22px', marginBottom: '10px'}}>{card.icon}</div>
                <b style={{fontSize: '15px'}}>{card.title}</b>
                <p style={{fontSize: '13px', color: 'var(--site-ink-soft)', margin: '6px 0 0'}}>
                  {card.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

function FeatureText({feature}: {feature: (typeof LANDING_FEATURES)[number]}) {
  return (
    <div>
      <div className="feat-ico" style={{marginBottom: '16px'}}>
        {feature.icon}
      </div>
      <h3
        style={{
          fontSize: 'clamp(22px,3vw,30px)',
          fontWeight: 800,
          letterSpacing: '-.02em',
          margin: '0 0 12px',
        }}
      >
        {feature.title}
      </h3>
      <p
        style={{
          fontSize: '15px',
          color: 'var(--site-ink-soft)',
          margin: '0 0 16px',
          wordBreak: 'keep-all',
        }}
      >
        {feature.body}
      </p>
      <ul
        style={{
          fontSize: '14px',
          color: 'var(--site-ink)',
          margin: 0,
          padding: 0,
          listStyle: 'none',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
        }}
      >
        {feature.bullets.map((b) => (
          <li key={b}>✓ {b}</li>
        ))}
      </ul>
    </div>
  );
}
