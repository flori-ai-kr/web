// Block-style hero — Claude Design "alpha" 그대로.
// 사용자 변경: GILUM SINCE 2024 (위) / FLOWER STUDIO (아래) / 간결 한글 카피.

export function HeroSection() {
  return (
    <section
      aria-label="hazel flower studio"
      className="relative w-full overflow-hidden border-b border-[color:var(--site-line)] bg-[color:var(--site-accent)] h-[clamp(187px,25vh,280px)] md:h-[clamp(280px,38vh,420px)]"
    >
      {/* 매우 옅은 그레인 — Claude Design block hero spec */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse at 30% 20%, rgba(255,255,255,0.05) 0, transparent 60%), radial-gradient(ellipse at 70% 80%, rgba(0,0,0,0.06) 0, transparent 60%)',
        }}
      />

      {/* Centered overlay */}
      <div
        className="relative z-10 h-full flex flex-col items-center justify-center text-center"
        style={{ padding: 'clamp(28px, 6vw, 72px)' }}
      >
        {/* GILUM SINCE 2024 (위) */}
        <p
          className="font-sans uppercase mb-3 sm:mb-4"
          style={{
            color: 'rgba(250, 246, 236, 0.86)',
            fontSize: '13px',
            letterSpacing: '0.32em',
            fontWeight: 400,
          }}
        >
          GILUM
          <span className="inline-block mx-3 opacity-60">·</span>
          SINCE 2024
        </p>

        {/* hazel. wordmark — Claude wordmarkBig=true: clamp(72px, 16vw, 240px) */}
        <h1
          className="font-display m-0"
          style={{
            color: '#FAF6EC',
            textShadow: '0 2px 30px rgba(0,0,0,0.35)',
            fontSize: 'clamp(72px, 16vw, 240px)',
            fontWeight: 400,
            letterSpacing: '-0.03em',
            lineHeight: 0.85,
          }}
        >
          Hazel<span style={{ color: '#FAF6EC', opacity: 0.55 }}>.</span>
        </h1>

        {/* FLOWER STUDIO (아래) */}
        <p
          className="font-sans uppercase mt-3 sm:mt-4"
          style={{
            color: 'rgba(250, 246, 236, 0.86)',
            fontSize: '13px',
            letterSpacing: '0.32em',
            fontWeight: 400,
          }}
        >
          FLOWER STUDIO
        </p>
      </div>
    </section>
  );
}
