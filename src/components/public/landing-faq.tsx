import {LANDING_FAQS} from '@/lib/landing-content';

export function LandingFaq() {
  return (
    <section id="faq" style={{padding: 'clamp(56px,8vw,100px) 0'}}>
      <div className="wrap" style={{maxWidth: '780px'}}>
        <div style={{textAlign: 'center', marginBottom: 'clamp(28px,4vw,48px)'}}>
          <div className="eyebrow" style={{marginBottom: '12px'}}>
            FAQ
          </div>
          <h2
            style={{
              fontSize: 'clamp(28px,4.4vw,46px)',
              fontWeight: 700,
              letterSpacing: '-.03em',
              margin: 0,
            }}
          >
            자주 묻는 질문
          </h2>
        </div>
        <div>
          {LANDING_FAQS.map((f, i) => (
            <details key={f.q} open={i === 0}>
              <summary>{f.q}</summary>
              <div className="ans">{f.a}</div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
