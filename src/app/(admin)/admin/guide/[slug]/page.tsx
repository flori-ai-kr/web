import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { BookOpen } from 'lucide-react';
import Link from 'next/link';
import { getAllSlugs, getArticleBySlug, getAllMetas, getSectionsWithArticles } from '@/lib/guide/articles';
import { extractToc } from '@/lib/guide/toc';
import { getAdjacent } from '@/lib/guide/nav';
import { GuideBlockRenderer } from '@/components/guide/guide-block';
import { GuideToc } from '@/components/guide/guide-toc';
import { GuideNav } from '@/components/guide/guide-nav';
import { GuideNavSheet } from '@/components/guide/guide-nav-sheet';
import { GuidePrevNext } from '@/components/guide/guide-prev-next';

export async function generateStaticParams() {
  return getAllSlugs().map(slug => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const article = getArticleBySlug(slug);
  if (!article) return {};
  return { title: `${article.title} — 사용 가이드` };
}

export default async function GuideArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = getArticleBySlug(slug);
  if (!article) notFound();

  const toc = extractToc(article.blocks);
  const metas = getAllMetas();
  const { prev, next } = getAdjacent(metas, slug);
  const sections = getSectionsWithArticles();

  return (
    <div className="flex gap-0 pb-16">
      {/* 좌측 네비 — 데스크탑 전용 */}
      <aside className="hidden lg:block w-56 xl:w-60 shrink-0 pr-6">
        <div className="sticky top-0 pt-1 max-h-screen overflow-y-auto pb-8">
          <Link
            href="/admin/guide"
            className="mb-5 flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <BookOpen className="size-4" />
            사용 가이드
          </Link>
          <GuideNav sections={sections} />
        </div>
      </aside>

      {/* 본문 */}
      <div className="min-w-0 flex-1">
        {/* 모바일 헤더 */}
        <div className="flex items-center gap-2 mb-4 lg:hidden">
          <GuideNavSheet sections={sections} />
          <Link
            href="/admin/guide"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            사용 가이드
          </Link>
          <span className="text-muted-foreground/50">/</span>
          <span className="text-sm text-foreground font-medium truncate">{article.title}</span>
        </div>

        {/* 아티클 헤더 */}
        <header className="mb-8">
          <h1 className="text-2xl font-bold text-foreground tracking-tight mb-2">
            {article.title}
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {article.description}
          </p>

          {article.tldr && article.tldr.length > 0 && (
            <div className="mt-5 rounded-xl border border-border bg-muted/40 p-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                한눈에 보기
              </p>
              <ul className="space-y-1.5">
                {article.tldr.map((line, i) => (
                  <li key={i} className="flex gap-2 text-sm text-foreground">
                    <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-brand" />
                    {line}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </header>

        {/* 본문 블록 */}
        <article>
          {article.blocks.map((block, i) => (
            <GuideBlockRenderer key={i} block={block} blockIndex={i} />
          ))}
        </article>

        <GuidePrevNext prev={prev} next={next} />
      </div>

      {/* 우측 TOC — 데스크탑 전용 */}
      {toc.length > 0 && (
        <aside className="hidden xl:block w-48 shrink-0 pl-8">
          <div className="sticky top-0 pt-1">
            <GuideToc items={toc} />
          </div>
        </aside>
      )}
    </div>
  );
}
