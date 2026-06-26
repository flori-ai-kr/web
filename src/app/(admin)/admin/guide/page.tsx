import type { Metadata } from 'next';
import Link from 'next/link';
import { BookOpen } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { getSectionsWithArticles } from '@/lib/guide/articles';
import { getGuideIcon } from '@/lib/guide/icon-map';

export const metadata: Metadata = { title: '사용 가이드' };

export default function GuidePage() {
  const sections = getSectionsWithArticles();

  return (
    <div className="space-y-8 pb-16">
      <PageHeader
        title="사용 가이드"
        description="모르는 기능이 있으면 여기서 찾아보세요. 사진과 함께 단계별로 알려드려요."
      />

      {/* 히어로 배너 */}
      <div className="rounded-2xl border border-brand/20 bg-gradient-to-br from-brand/5 to-brand/10 p-6">
        <div className="flex items-start gap-4">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-brand/10">
            <BookOpen className="size-6 text-brand" />
          </span>
          <div>
            <p className="font-semibold text-foreground">처음 쓰시나요?</p>
            <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
              <Link href="/admin/guide/getting-started" className="font-medium text-brand underline underline-offset-2">
                flori 시작하기
              </Link>
              부터 따라해보세요. 로그인부터 첫 매출 등록까지 5분이면 충분해요.
            </p>
          </div>
        </div>
      </div>

      {/* 섹션별 아티클 카드 */}
      <div className="space-y-8">
        {sections.map(section => (
          <section key={section.id}>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              {section.title}
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {section.articles.map(article => {
                const Icon = getGuideIcon(article.icon);
                return (
                  <Link
                    key={article.slug}
                    href={`/admin/guide/${article.slug}`}
                    className="group flex flex-col gap-2 rounded-xl border border-border bg-card p-4 transition-all hover:border-brand/40 hover:shadow-sm"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
                        <Icon className="size-4" />
                      </span>
                      <span className="text-sm font-medium text-foreground group-hover:text-brand transition-colors line-clamp-1">
                        {article.title}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                      {article.description}
                    </p>
                  </Link>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
