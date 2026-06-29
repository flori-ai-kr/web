'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { GuideSectionWithArticles } from '@/lib/guide/types';

export function GuideNav({ sections }: { sections: GuideSectionWithArticles[] }) {
  const pathname = usePathname();

  return (
    <nav aria-label="가이드 목차">
      {sections.map(section => (
        <div key={section.id} className="mb-5">
          <p className="mb-1.5 px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {section.title}
          </p>
          <ul className="space-y-0.5">
            {section.articles.map(article => {
              const href = `/admin/guide/${article.slug}`;
              const isActive = pathname === href;
              return (
                <li key={article.slug}>
                  <Link
                    href={href}
                    className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors ${
                      isActive
                        ? 'bg-brand/10 text-brand font-medium'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    }`}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    {article.title}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
