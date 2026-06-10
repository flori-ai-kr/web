export function LandingCta() {
  return (
    <section
      style={{
        padding: 'clamp(56px,8vw,96px) 0',
        background: 'var(--site-ink)',
        color: '#fff',
        textAlign: 'center',
      }}
    >
      <div className="wrap">
        <h2
          style={{
            fontSize: 'clamp(26px,4vw,42px)',
            fontWeight: 700,
            margin: '0 0 10px',
            letterSpacing: '-.02em',
          }}
        >
          지금 사전등록하면 첫 달 무료
        </h2>
        <p style={{fontSize: '15px', color: '#A8B0BC', margin: '0 0 28px'}}>
          선착순 100명 · 6월 내 출시 예정
        </p>
        <a
          href="#waitlist"
          className="btn-rose"
          style={{fontSize: '16px', padding: '14px 32px'}}
        >
          사전등록하고 첫 달 무료받기 →
        </a>
      </div>
    </section>
  );
}
