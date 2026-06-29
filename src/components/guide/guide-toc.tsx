'use client';

import { useEffect, useRef, useState } from 'react';
import type { GuideTocItem } from '@/lib/guide/types';

export function GuideToc({ items }: { items: GuideTocItem[] }) {
  const [active, setActive] = useState<string>('');
  // 클릭으로 부드럽게 스크롤하는 동안엔 옵저버 갱신을 잠시 무시(중간 헤딩으로 active가 튀는 것 방지).
  const lockRef = useRef(false);
  const lockTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (items.length === 0) return;

    // 현재 화면 밴드에 들어온 헤딩들을 추적하고, 그중 문서 순서상 가장 위(헤더에 가장 가까운) 것을 활성화.
    const visible = new Set<string>();

    const observer = new IntersectionObserver(
      entries => {
        for (const entry of entries) {
          if (entry.isIntersecting) visible.add(entry.target.id);
          else visible.delete(entry.target.id);
        }
        if (lockRef.current) return;
        const current = items.find(it => visible.has(it.id));
        if (current) setActive(current.id);
      },
      // 고정 헤더(56px) 바로 아래를 기준선으로 잡아, 상단 밴드에 든 헤딩을 활성으로 본다.
      { rootMargin: '-72px 0px -55% 0px', threshold: 0 },
    );

    items.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => {
      observer.disconnect();
      if (lockTimer.current) clearTimeout(lockTimer.current);
    };
  }, [items]);

  if (items.length === 0) return null;

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    const el = document.getElementById(id);
    if (!el) return;
    setActive(id); // 즉시 하이라이트(옵저버를 기다리지 않음)
    lockRef.current = true;
    if (lockTimer.current) clearTimeout(lockTimer.current);
    lockTimer.current = setTimeout(() => {
      lockRef.current = false;
    }, 700);
    // scroll-margin-top(scroll-mt-24)을 존중하므로 헤더에 가리지 않는다.
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    history.replaceState(null, '', `#${id}`);
  };

  return (
    <nav aria-label="이 문서 목차">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        이 문서
      </p>
      <ul className="space-y-0.5 border-l border-border">
        {items.map(item => {
          const isActive = active === item.id;
          return (
            <li key={item.id} className="-ml-px">
              <a
                href={`#${item.id}`}
                onClick={e => handleClick(e, item.id)}
                aria-current={isActive ? 'location' : undefined}
                className={`block border-l-2 pl-3 pr-2 py-1.5 text-xs leading-snug transition-colors ${
                  isActive
                    ? 'border-brand font-medium text-brand'
                    : 'border-transparent text-muted-foreground hover:border-border hover:text-foreground'
                }`}
              >
                {item.text}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
