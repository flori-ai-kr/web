'use client';

import Image from 'next/image';
import { ChevronDown } from 'lucide-react';
import { useState } from 'react';
import type { GuideBlock } from '@/lib/guide/types';
import { headingId } from '@/lib/guide/toc';
import { renderInline } from '@/lib/guide/inline-render';

const CALLOUT_STYLES = {
  tip: {
    container: 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800',
    icon: '💡',
    titleClass: 'text-emerald-800 dark:text-emerald-300',
    textClass: 'text-emerald-700 dark:text-emerald-400',
  },
  warn: {
    container: 'bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800',
    icon: '⚠️',
    titleClass: 'text-amber-800 dark:text-amber-300',
    textClass: 'text-amber-700 dark:text-amber-400',
  },
  note: {
    container: 'bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800',
    icon: 'ℹ️',
    titleClass: 'text-blue-800 dark:text-blue-300',
    textClass: 'text-blue-700 dark:text-blue-400',
  },
} as const;

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-border last:border-0">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="flex w-full items-start justify-between gap-4 py-4 text-left"
        aria-expanded={open}
      >
        <span className="text-sm font-medium text-foreground">{q}</span>
        <ChevronDown
          className={`mt-0.5 size-4 shrink-0 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <p className="pb-4 text-sm text-muted-foreground leading-relaxed">
          {renderInline(a)}
        </p>
      )}
    </div>
  );
}

export function GuideBlockRenderer({ block, blockIndex }: { block: GuideBlock; blockIndex: number }) {
  switch (block.type) {
    case 'heading':
      return (
        <h2
          id={headingId(blockIndex)}
          className="scroll-mt-6 text-lg font-semibold text-foreground mt-10 first:mt-0 mb-3"
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
              <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-brand" />
              <span className="text-sm text-muted-foreground leading-relaxed">
                {renderInline(item)}
              </span>
            </li>
          ))}
        </ul>
      );

    case 'shot': {
      const ext = block.kind === 'gif' ? 'gif' : 'webp';
      const src = `/guide/${block.src}.${ext}`;
      return (
        <figure className="mb-6 overflow-hidden rounded-xl border border-border bg-muted/30">
          <div className="relative w-full" style={{ aspectRatio: '16/9' }}>
            <Image
              src={src}
              alt={block.alt}
              fill
              className="object-cover object-top"
              sizes="(max-width: 768px) 100vw, 700px"
            />
          </div>
          {block.caption && (
            <figcaption className="px-4 py-2 text-xs text-muted-foreground text-center border-t border-border">
              {block.caption}
            </figcaption>
          )}
        </figure>
      );
    }

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
