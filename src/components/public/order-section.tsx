import {HAZEL_BUSINESS, HAZEL_LINKS} from '@/lib/public-config';

const ORDER_STEPS = [
  {
    no: '01',
    title: '문의',
    desc: '원하시는 분위기, 예산, 수령일을 카카오톡 채널 또는 네이버 톡톡으로 편하게 알려주세요.',
  },
  {
    no: '02',
    title: '상담',
    desc: '용도, 받으실 분의 취향, 전하고 싶은 말을 함께 정리하며 꽃 구성을 제안드립니다.',
  },
  {
    no: '03',
    title: '제작 · 수령',
    desc: '수령 1일 전까지 확정된 이미지를 공유드리고, 매장 수령 또는 퀵 배송으로 전달드립니다.',
  },
];

const CHANNELS = [
  {
    label: 'Kakao Channel',
    desc: '가장 빠른 답변',
    href: HAZEL_LINKS.kakaoChannel,
    ariaLabel: '카카오톡 채널로 문의하기 (새 탭)',
    accent: true,
  },
  {
    label: 'Naver 톡톡',
    desc: '리뷰 · 예약',
    href: HAZEL_LINKS.naverPlace,
    ariaLabel: '네이버 플레이스에서 문의하기 (새 탭)',
    accent: false,
  },
  {
    label: 'Instagram DM',
    desc: '무드 레퍼런스와 함께',
    href: HAZEL_LINKS.instagram,
    ariaLabel: '인스타그램 DM으로 문의하기 (새 탭)',
    accent: false,
  },
];

export function OrderSection() {
  return (
    <section
      id="order"
      className="border-t border-[color:var(--site-pewter)]/15 scroll-mt-24"
    >
      <div className="max-w-6xl mx-auto px-6 py-24 sm:py-32 lg:py-40">
        {/* Header */}
        <div className="mb-16 lg:mb-20 max-w-2xl">
          <p className="text-[11px] uppercase tracking-[0.3em] text-[color:var(--site-oxblood)] mb-6">
            Order
          </p>
          <h2
            className="font-serif text-[40px] sm:text-[56px] leading-[1.08] text-[color:var(--site-charcoal)] mb-6"
            style={{ fontWeight: 300, letterSpacing: '-0.015em' }}
          >
            how to order.
          </h2>
          <p className="text-base text-[color:var(--site-charcoal)]/70 leading-relaxed font-light">
            온라인 결제는 아직 준비 중입니다. 아래 채널로 편하게 말씀 주세요.
          </p>
          <p className="mt-4 text-sm text-[color:var(--site-charcoal)]/70 font-light">
            전화{' '}
            <a
              href={HAZEL_BUSINESS.phoneHref}
              className="text-[color:var(--site-charcoal)] hover:text-[color:var(--site-oxblood)] transition-colors tabular-nums"
            >
              {HAZEL_BUSINESS.phone}
            </a>
          </p>
        </div>

        {/* Steps */}
        <ol className="grid grid-cols-1 sm:grid-cols-3 gap-10 sm:gap-8 mb-20">
          {ORDER_STEPS.map((step) => (
            <li key={step.no} className="relative">
              <div
                className="font-serif text-[52px] leading-none text-[color:var(--site-oxblood)] mb-4 tabular-nums"
                style={{ fontWeight: 300 }}
              >
                {step.no}
              </div>
              <h3 className="text-lg text-[color:var(--site-charcoal)] mb-3 font-normal">
                {step.title}
              </h3>
              <p className="text-[14px] leading-[1.75] text-[color:var(--site-charcoal)]/70 font-light">
                {step.desc}
              </p>
            </li>
          ))}
        </ol>

        <div className="w-16 h-px bg-[color:var(--site-pewter)]/40 mb-16" />

        {/* Channels */}
        <div>
          <p className="text-[11px] uppercase tracking-[0.3em] text-[color:var(--site-pewter)] mb-8">
            Reach us
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {CHANNELS.map((ch) => (
              <a
                key={ch.label}
                href={ch.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={ch.ariaLabel}
                className={`group flex flex-col justify-between gap-6 p-6 sm:p-8 border transition-colors ${
                  ch.accent
                    ? 'border-[color:var(--site-charcoal)] bg-[color:var(--site-charcoal)] text-[color:var(--site-ivory)] hover:bg-[color:var(--site-oxblood)] hover:border-[color:var(--site-oxblood)]'
                    : 'border-[color:var(--site-pewter)]/30 text-[color:var(--site-charcoal)] hover:border-[color:var(--site-charcoal)]'
                }`}
              >
                <div>
                  <div className="font-serif text-2xl mb-1.5" style={{ fontWeight: 400 }}>
                    {ch.label}
                  </div>
                  <div className={`text-xs font-light ${ch.accent ? 'text-[color:var(--site-ivory)]/70' : 'text-[color:var(--site-pewter)]'}`}>
                    {ch.desc}
                  </div>
                </div>
                <div className={`text-[10px] uppercase tracking-[0.28em] ${ch.accent ? 'text-[color:var(--site-ivory)]/70' : 'text-[color:var(--site-pewter)]'} flex items-center gap-2`}>
                  <span>open</span>
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true" className="transition-transform group-hover:translate-x-0.5">
                    <path d="M2 6 L10 6 M7 3 L10 6 L7 9" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              </a>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
