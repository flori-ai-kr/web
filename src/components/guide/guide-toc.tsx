'use client';

import { useEffect, useRef, useState } from 'react';
import type { GuideTocItem } from '@/lib/guide/types';

export function GuideToc({ items }: { items: GuideTocItem[] }) {
  const [active, setActive] = useState<string>('');
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    if (items.length === 0) return;

    // app-canvas fixed 컨테이너 안에서 동작 — root=null(viewport)로 충분.
    observerRef.current = new IntersectionObserver(
      entries => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActive(entry.target.id);
            break;
          }
        }
      },
      { rootMargin: '-10% 0px -70% 0px', threshold: 0 },
    );

    items.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observerRef.current?.observe(el);
    });

    return () => observerRef.current?.disconnect();
  }, [items]);

  if (items.length === 0) return null;

  return (
    <nav aria-label="이 문서 목차">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        이 문서
      </p>
      <ul className="space-y-1">
        {items.map(item => (
          <li key={item.id}>
            <a
              href={`#${item.id}`}
              className={`block text-xs leading-snug py-1 px-2 rounded-md transition-colors ${
                active === item.id
                  ? 'bg-brand/10 text-brand font-medium'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              {item.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
