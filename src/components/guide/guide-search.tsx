'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Search, X } from 'lucide-react';
import { getGuideIcon } from '@/lib/guide/icon-map';
import type { GuideSectionWithArticles } from '@/lib/guide/types';

export function GuideSearch({ sections }: { sections: GuideSectionWithArticles[] }) {
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();

  // 검색 중이면 섹션 무시하고 평면 매칭 리스트, 아니면 섹션 그대로.
  const matched = useMemo(() => {
    if (!q) return null;
    return sections
      .flatMap(s => s.articles.map(a => ({ ...a, sectionTitle: s.title })))
      .filter(
        a =>
          a.title.toLowerCase().includes(q) ||
          a.description.toLowerCase().includes(q) ||
          (a.tldr ?? []).some(t => t.toLowerCase().includes(q)),
      );
  }, [sections, q]);

  return (
    <div className="space-y-8">
      {/* 검색창 */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <input
          type="text"
          inputMode="search"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="어떤 기능이 궁금하세요? (예: 매출, 예약, 알림)"
          aria-label="가이드 검색"
          className="w-full appearance-none rounded-xl border border-border bg-card py-3.5 pl-12 pr-11 text-sm text-foreground shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:border-brand/40 focus-visible:ring-2 focus-visible:ring-brand/30"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery('')}
            aria-label="검색어 지우기"
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      {/* 검색 결과 */}
      {matched !== null ? (
        matched.length > 0 ? (
          <section>
            <p className="mb-3 text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{matched.length}개</span> 가이드를 찾았어요
            </p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {matched.map(article => (
                <ArticleCard key={article.slug} article={article} badge={article.sectionTitle} />
              ))}
            </div>
          </section>
        ) : (
          <div className="rounded-xl border border-border bg-card py-12 text-center">
            <p className="text-sm font-medium text-foreground">검색 결과가 없어요</p>
            <p className="mt-1 text-sm text-muted-foreground">
              다른 단어로 찾아보거나, 아래 목록에서 둘러보세요.
            </p>
            <button
              type="button"
              onClick={() => setQuery('')}
              className="mt-4 text-sm font-medium text-brand underline underline-offset-2"
            >
              전체 가이드 보기
            </button>
          </div>
        )
      ) : (
        /* 섹션별 카드 그리드 */
        <div className="space-y-8">
          {sections.map(section => (
            <section key={section.id}>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                {section.title}
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {section.articles.map(article => (
                  <ArticleCard key={article.slug} article={article} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function ArticleCard({
  article,
  badge,
}: {
  article: { slug: string; title: string; description: string; icon: string };
  badge?: string;
}) {
  const Icon = getGuideIcon(article.icon);
  return (
    <Link
      href={`/admin/guide/${article.slug}`}
      className="group flex flex-col gap-2 rounded-xl border border-border bg-card p-4 transition-[border-color,box-shadow] hover:border-brand/40 hover:shadow-sm"
    >
      <div className="flex items-center gap-2.5">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
          <Icon className="size-4" aria-hidden="true" />
        </span>
        <span className="text-sm font-medium text-foreground transition-colors group-hover:text-brand line-clamp-1">
          {article.title}
        </span>
        {badge && (
          <span className="ml-auto shrink-0 rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
            {badge}
          </span>
        )}
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
        {article.description}
      </p>
    </Link>
  );
}
