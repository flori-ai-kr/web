import {LANDING_FEATURES} from '@/lib/landing-content';
import {FeatureCarousel} from './feature-carousel';

const AUX_CARDS: {
  icon: string;
  title: string;
  desc: string;
  badge?: string;
  accent?: boolean;
}[] = [
  {icon: '📑', title: '장부 내보내기', desc: '세무 신고·정산 자료가 필요할 때 엑셀·PDF로 바로.'},
  {icon: '📲', title: '설치 없이 폰·PC 어디서나', desc: '어디서 켜도 같은 기록으로 이어서.'},
  {icon: '🔔', title: '푸시 알림', desc: '예약·정산을 놓치지 않게.'},
  {
    icon: '🌸',
    title: 'flori AI',
    badge: '준비 중',
    desc: '음성으로 예약·완료 처리부터 매출 분석까지, 사장님만을 위한 비서.',
    accent: true,
  },
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
                fontWeight: 700,
                letterSpacing: '-.03em',
                margin: 0,
              }}
            >
              흩어진 꽃집 운영, flori 하나로
            </h2>
          </div>

          {LANDING_FEATURES.map((feature, i) => {
            const isReversed = i % 2 === 1;
            return (
              <div
                key={feature.title}
                className={`feat-row${isReversed ? ' feat-row--rev' : ''}`}
                style={{
                  marginBottom: i < LANDING_FEATURES.length - 1 ? 'clamp(48px,7vw,88px)' : 0,
                }}
              >
                {/* 데스크탑: 텍스트 | 이미지 2단. 모바일: 제목 → 이미지 → 설명 (grid-areas) */}
                <FeatureHeader feature={feature} />
                <FeatureVisual feature={feature} />
                <FeatureDetail feature={feature} />
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
                fontWeight: 700,
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
              <div
                className="card"
                key={card.title}
                style={{
                  padding: '22px',
                  ...(card.accent
                    ? {
                        background: 'linear-gradient(135deg, var(--site-accent-soft), #fff)',
                        border: '1px solid var(--site-accent)',
                      }
                    : {}),
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginBottom: '10px',
                  }}
                >
                  <span style={{fontSize: '22px'}}>{card.icon}</span>
                  {card.badge && (
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        color: '#fff',
                        background: 'var(--site-accent)',
                        padding: '2px 9px',
                        borderRadius: '999px',
                        letterSpacing: '.02em',
                      }}
                    >
                      {card.badge}
                    </span>
                  )}
                </div>
                <b style={{fontSize: '15px', color: card.accent ? 'var(--site-accent-deep)' : undefined}}>
                  {card.title}
                </b>
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

// 화면 미리보기: images 있으면 캐러셀, 없으면 placeholder(.ph). grid-area:image로 배치.
function FeatureVisual({feature}: {feature: (typeof LANDING_FEATURES)[number]}) {
  if (feature.images?.length) {
    return <FeatureCarousel images={feature.images} title={feature.title} />;
  }
  return (
    <div
      className="ph feat-visual feat-frame"
      style={{aspectRatio: '4/3'}}
      aria-label={`${feature.title} 미리보기`}
    >
      <div className="ico">🌷</div>
      <b>{feature.title}</b>
    </div>
  );
}

// 아이콘 + 제목 (grid-area:header). 모바일에선 이미지 위에 표시된다.
function FeatureHeader({feature}: {feature: (typeof LANDING_FEATURES)[number]}) {
  return (
    <div className="feat-header">
      <div className="feat-ico" style={{marginBottom: '16px'}}>
        {feature.icon}
      </div>
      <h3
        style={{
          fontSize: 'clamp(22px,3vw,30px)',
          fontWeight: 700,
          letterSpacing: '-.02em',
          margin: 0,
        }}
      >
        {feature.title}
      </h3>
    </div>
  );
}

// 설명 + 체크리스트 (grid-area:detail). 모바일에선 이미지 아래에 표시된다.
function FeatureDetail({feature}: {feature: (typeof LANDING_FEATURES)[number]}) {
  return (
    <div className="feat-detail">
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
