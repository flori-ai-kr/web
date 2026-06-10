export function LandingHero() {
  return (
    <section
      className="wrap"
      style={{
        textAlign: 'center',
        padding: 'clamp(56px,9vw,104px) 0 clamp(40px,6vw,72px)',
      }}
    >
      <span className="chip" style={{marginBottom: '26px'}}>
        🌷 꽃집 사장님을 위한 운영 서비스
      </span>
      <h1
        style={{
          fontSize: 'clamp(38px,6.4vw,76px)',
          fontWeight: 800,
          lineHeight: 1.08,
          letterSpacing: '-.035em',
          margin: 0,
        }}
      >
        꽃에만 집중하세요.
        <br />
        <span style={{color: 'var(--site-accent)'}}>살림은 flori가</span> 챙길게요.
      </h1>
      <p
        style={{
          fontSize: 'clamp(16px,2.1vw,20px)',
          color: 'var(--site-ink-soft)',
          margin: '24px auto 0',
          maxWidth: '34ch',
          wordBreak: 'keep-all',
          lineHeight: 1.75,
        }}
      >
        매출·지출·고객·예약·사진첩까지. 꽃집 운영에 필요한 모든 기록을 flori 하나로.
      </p>
      <div
        className="flex items-center justify-center"
        style={{gap: '12px', marginTop: '36px', flexWrap: 'wrap'}}
      >
        <a href="#waitlist" className="btn-rose">
          사전등록하고 첫 달 무료받기 →
        </a>
        <a href="#features" className="btn-ghost">
          기능 둘러보기
        </a>
      </div>
      <p style={{fontSize: '13px', color: 'var(--site-muted)', marginTop: '16px'}}>
        카카오 · 네이버 · 구글 계정으로 30초 만에 시작
      </p>

      {/* 큰 제품 미리보기 (Linear식) */}
      <div
        className="browser"
        style={{
          marginTop: 'clamp(44px,7vw,76px)',
          maxWidth: '980px',
          marginLeft: 'auto',
          marginRight: 'auto',
          textAlign: 'left',
        }}
      >
        <div className="bar">
          <span className="d" style={{background: '#E6C4CE'}} />
          <span className="d" style={{background: '#E7E2CF'}} />
          <span className="d" style={{background: '#DCE3D6'}} />
          <span style={{marginLeft: '10px', fontSize: '12px', color: 'var(--site-muted)'}}>
            app.flori.ai.kr/admin
          </span>
        </div>
        <div
          className="ph"
          style={{aspectRatio: '16/9', border: 'none', borderRadius: 0, margin: 0}}
          aria-label="flori 대시보드 미리보기"
        >
          <div className="ico">🌷</div>
          <b>flori 대시보드 미리보기</b>
          <span>오늘 번 돈·예약·단골을 한 화면에서. 곧 실제 화면으로 보여드릴게요.</span>
        </div>
      </div>
    </section>
  );
}
