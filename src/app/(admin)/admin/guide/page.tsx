import type { Metadata } from 'next';
import Link from 'next/link';
import { BookOpen } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { getSectionsWithArticles } from '@/lib/guide/articles';
import { GuideSearch } from '@/components/guide/guide-search';

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
            <p className="font-semibold text-foreground">처음이신가요?</p>
            <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
              <Link href="/admin/guide/getting-started" className="font-medium text-brand underline underline-offset-2">
                flori 시작하기
              </Link>
              부터 따라해보세요. 로그인부터 첫 매출 등록까지 5분이면 충분해요.
            </p>
          </div>
        </div>
      </div>

      {/* 검색 + 섹션별 아티클 카드 */}
      <GuideSearch sections={sections} />
    </div>
  );
}
