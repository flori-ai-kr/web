'use client';

import Image from 'next/image';
import { ChevronDown } from 'lucide-react';
import { useId, useState } from 'react';
import type { GuideBlock } from '@/lib/guide/types';
import { headingId } from '@/lib/guide/toc';
import { renderInline } from '@/lib/guide/inline-render';

// 시맨틱 상태 토큰(--success/warning/info + -soft)을 쓴다. CSS 변수라 .dark 에서 자동으로 뒤집히고
// (OS prefers-color-scheme 가 아닌) 앱 테마를 따른다 — 라이트/다크 모두 WCAG AA.
const CALLOUT_STYLES = {
  tip: {
    container: 'bg-success-soft border-success/25',
    icon: '💡',
    titleClass: 'text-success',
    textClass: 'text-foreground/80',
  },
  warn: {
    container: 'bg-warning-soft border-warning/30',
    icon: '⚠️',
    titleClass: 'text-warning',
    textClass: 'text-foreground/80',
  },
  note: {
    container: 'bg-info-soft border-info/25',
    icon: 'ℹ️',
    titleClass: 'text-info',
    textClass: 'text-foreground/80',
  },
} as const;

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  return (
    <div className="border-b border-border last:border-0">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="flex w-full items-start justify-between gap-4 py-4 text-left"
        aria-expanded={open}
        aria-controls={panelId}
      >
        <span className="text-sm font-medium text-foreground">{q}</span>
        <ChevronDown
          className={`mt-0.5 size-4 shrink-0 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
      </button>
      {open && (
        <p id={panelId} className="pb-4 text-sm text-muted-foreground leading-relaxed">
          {renderInline(a)}
        </p>
      )}
    </div>
  );
}

function ShotBlock({ block }: { block: Extract<GuideBlock, { type: 'shot' }> }) {
  const [error, setError] = useState(false);
  // 캡처마다 비율이 달라(데스크탑·모바일·정사각) 잘리지 않도록 실제 이미지 비율에 박스를 맞춘다.
  const [ratio, setRatio] = useState<number | null>(null);
  const ext = block.kind === 'gif' ? 'gif' : block.kind === 'png' ? 'png' : 'webp';
  const src = `/guide/${block.src}.${ext}`;
  // 세로(폰) 스크린샷은 휴대폰 목업 프레임으로, 가로/정사각은 일반 카드로 표시.
  const isPortrait = ratio !== null && ratio < 0.9;

  const img = error ? (
    <div className="absolute inset-0 flex items-center justify-center bg-muted text-xs text-muted-foreground">
      스크린샷 준비 중
    </div>
  ) : (
    <Image
      src={src}
      alt={block.alt}
      fill
      className="object-contain"
      sizes="(max-width: 768px) 100vw, 700px"
      onError={() => setError(true)}
      onLoad={e => {
        const i = e.currentTarget;
        if (i.naturalWidth > 0 && i.naturalHeight > 0) setRatio(i.naturalWidth / i.naturalHeight);
      }}
    />
  );

  if (isPortrait) {
    return (
      <figure className="mb-6">
        <div className="mx-auto w-full max-w-[230px] rounded-[1.9rem] bg-[#1b1b1f] p-[5px] shadow-sm">
          <div className="relative overflow-hidden rounded-[1.55rem] bg-muted" style={{ aspectRatio: ratio }}>
            {img}
          </div>
        </div>
        {block.caption && (
          <figcaption className="mt-2.5 text-center text-xs text-muted-foreground">{block.caption}</figcaption>
        )}
      </figure>
    );
  }

  return (
    <figure className="mb-6 overflow-hidden rounded-xl border border-border bg-muted/30">
      <div className="relative w-full" style={{ aspectRatio: ratio ?? 16 / 9 }}>
        {img}
      </div>
      {block.caption && (
        <figcaption className="px-4 py-2 text-xs text-muted-foreground text-center border-t border-border">
          {block.caption}
        </figcaption>
      )}
    </figure>
  );
}

/** 휴대폰 목업 프레임 안에 세로 스크린샷을 표시. */
function PhoneShot({ src, alt }: { src: string; alt: string }) {
  const [ratio, setRatio] = useState<number | null>(null);
  const [error, setError] = useState(false);
  return (
    <div className="mx-auto w-full max-w-[210px] rounded-[1.9rem] bg-[#1b1b1f] p-[5px] shadow-sm">
      <div
        className="relative overflow-hidden rounded-[1.55rem] bg-muted"
        style={{ aspectRatio: ratio ?? 9 / 19.5 }}
      >
        {error ? (
          <div className="absolute inset-0 flex items-center justify-center bg-muted text-xs text-muted-foreground">
            준비 중
          </div>
        ) : (
          <Image
            src={src}
            alt={alt}
            fill
            className="object-cover"
            sizes="210px"
            onError={() => setError(true)}
            onLoad={e => {
              const img = e.currentTarget;
              if (img.naturalWidth > 0 && img.naturalHeight > 0) {
                setRatio(img.naturalWidth / img.naturalHeight);
              }
            }}
          />
        )}
      </div>
    </div>
  );
}

function PhoneStepsBlock({ block }: { block: Extract<GuideBlock, { type: 'phone-steps' }> }) {
  return (
    <ol className="mb-6 grid gap-x-5 gap-y-7 sm:grid-cols-2 lg:grid-cols-3">
      {block.items.map((item, i) => {
        const ext = item.kind === 'gif' ? 'gif' : item.kind === 'png' ? 'png' : 'webp';
        return (
          <li key={i} className="flex flex-col gap-3">
            <PhoneShot src={`/guide/${item.src}.${ext}`} alt={item.caption} />
            <div className="flex items-start gap-2">
              <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-brand text-[11px] font-bold text-brand-foreground">
                {i + 1}
              </span>
              <span className="text-sm leading-relaxed text-muted-foreground">{renderInline(item.caption)}</span>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function TabsBlock({ block }: { block: Extract<GuideBlock, { type: 'tabs' }> }) {
  const [active, setActive] = useState(0);
  const current = block.tabs[active] ?? block.tabs[0];
  return (
    <div className="mb-6">
      <div role="tablist" className="mb-4 flex gap-1 rounded-xl border border-border bg-muted/40 p-1">
        {block.tabs.map((tab, i) => (
          <button
            key={tab.label}
            type="button"
            role="tab"
            aria-selected={active === i}
            onClick={() => setActive(i)}
            className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              active === i ? 'bg-card text-brand shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div>
        {current.blocks.map((b, i) => (
          // 탭 내부 블록은 TOC/앵커 대상이 아니므로 큰 오프셋으로 상위 heading id와 충돌 방지.
          <GuideBlockRenderer key={i} block={b} blockIndex={1000 + i} />
        ))}
      </div>
    </div>
  );
}

export function GuideBlockRenderer({ block, blockIndex }: { block: GuideBlock; blockIndex: number }) {
  switch (block.type) {
    case 'heading':
      return (
        <h2
          id={headingId(blockIndex)}
          className="scroll-mt-24 text-lg font-semibold text-foreground mt-10 first:mt-0 mb-3"
        >
          {block.text}
        </h2>
      );

    case 'paragraph':
      return (
        <p className="text-sm text-muted-foreground leading-relaxed mb-4">
          {renderInline(block.text)}
        </p>
      );

    case 'steps':
      return (
        <ol className="mb-4 space-y-3">
          {block.items.map((item, i) => (
            <li key={i} className="flex gap-3">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-brand/10 text-xs font-semibold text-brand">
                {i + 1}
              </span>
              <span className="text-sm text-muted-foreground leading-relaxed pt-0.5">
                {renderInline(item)}
              </span>
            </li>
          ))}
        </ol>
      );

    case 'bullets':
      return (
        <ul className="mb-4 space-y-2">
          {block.items.map((item, i) => (
            <li key={i} className="flex gap-2.5">
              <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-brand" aria-hidden="true" />
              <span className="text-sm text-muted-foreground leading-relaxed">
                {renderInline(item)}
              </span>
            </li>
          ))}
        </ul>
      );

    case 'shot':
      return <ShotBlock block={block} />;

    case 'tabs':
      return <TabsBlock block={block} />;

    case 'phone-steps':
      return <PhoneStepsBlock block={block} />;

    case 'callout': {
      const style = CALLOUT_STYLES[block.variant];
      return (
        <div className={`mb-4 rounded-xl border p-4 ${style.container}`}>
          <p className={`mb-1 text-sm font-semibold ${style.titleClass}`}>
            <span aria-hidden="true">{style.icon}</span>{' '}
            {block.title ?? (block.variant === 'tip' ? '팁' : block.variant === 'warn' ? '주의' : '참고')}
          </p>
          <p className={`text-sm leading-relaxed ${style.textClass}`}>
            {renderInline(block.text)}
          </p>
        </div>
      );
    }

    case 'faq':
      return (
        <div className="mb-4 rounded-xl border border-border">
          <p className="px-4 pt-4 pb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            자주 묻는 질문
          </p>
          <div className="px-4">
            {block.items.map((item, i) => (
              <FaqItem key={i} q={item.q} a={item.a} />
            ))}
          </div>
        </div>
      );

    default:
      return null;
  }
}
