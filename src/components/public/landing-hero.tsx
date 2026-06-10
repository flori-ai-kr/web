export function LandingHero() {
  return (
    <section
      className="wrap"
      style={{
        textAlign: 'center',
        // padding shorthand는 .wrap의 가로 패딩을 0으로 덮어쓰므로 세로만 지정
        paddingTop: 'clamp(56px,9vw,104px)',
        paddingBottom: 'clamp(40px,6vw,72px)',
      }}
    >
      <span className="chip" style={{marginBottom: '26px'}}>
        🌷 꽃집 사장님을 위한 운영 서비스
      </span>
      <h1
        style={{
          /* 두 번째 줄("운영은 flori가 챙길게요." ≈ 11.5em)이 어떤 폭에서도
             한 줄에 들어가도록 vw 연동 + nowrap. 중간 줄바꿈("집중하세\n요") 방지. */
          fontSize: 'clamp(22px,7vw,64px)',
          fontWeight: 600,
          lineHeight: 1.22,
          letterSpacing: '-.03em',
          margin: 0,
        }}
      >
        <span style={{whiteSpace: 'nowrap'}}>꽃에만 집중하세요.</span>
        <br />
        <span style={{whiteSpace: 'nowrap'}}>
          <span style={{color: 'var(--site-accent)'}}>운영은 flori가</span> 챙길게요.
        </span>
      </h1>
      <p
        style={{
          fontSize: 'clamp(15px,2.1vw,20px)',
          color: 'var(--site-ink-soft)',
          margin: '24px auto 0',
          lineHeight: 1.75,
        }}
      >
        <span style={{whiteSpace: 'nowrap'}}>매출·지출·단골·예약·사진첩까지,</span>
        <br />
        <span style={{whiteSpace: 'nowrap'}}>흩어진 꽃집 운영을 flori 하나로.</span>
      </p>
      <div
        className="flex items-center justify-center"
        style={{gap: '12px', marginTop: '36px', flexWrap: 'wrap'}}
      >
        <a href="#waitlist" className="btn-rose">
          사전등록하고 첫 달 무료받기 ↓
        </a>
      </div>
      <p style={{fontSize: '13px', color: 'var(--site-muted)', marginTop: '16px'}}>
        <span
          style={{
            color: 'var(--site-accent-deep)',
            fontWeight: 600,
            textDecoration: 'underline',
            textDecorationColor: 'var(--site-accent)',
            textDecorationThickness: '2px',
            textUnderlineOffset: '4px',
          }}
        >
          6월 중 정식 출시
        </span>{' '}
        예정
      </p>

      {/* 큰 제품 미리보기 (Linear식 브라우저 프레임) — 배치는 .hero-preview CSS가 담당(모바일 풀블리드) */}
      <div className="browser hero-preview">
        <div className="bar">
          <span className="d" style={{background: '#E6C4CE'}} />
          <span className="d" style={{background: '#E7E2CF'}} />
          <span className="d" style={{background: '#DCE3D6'}} />
          <span style={{marginLeft: '10px', fontSize: '12px', color: 'var(--site-muted)'}}>
            flori.ai.kr
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
