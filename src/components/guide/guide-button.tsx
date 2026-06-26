import Link from 'next/link';
import { CircleHelp } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * 각 기능 페이지 PageHeader actions 슬롯에 넣는 가이드 진입 버튼.
 * slug: 이동할 가이드 아티클 슬러그 (예: 'sales')
 * from: ?from= 파라미터용 기능 키. 생략 시 slug와 동일.
 */
export function GuideButton({ slug, from }: { slug: string; from?: string }) {
  const href = `/admin/guide/${slug}?from=${from ?? slug}`;
  return (
    <Button variant="ghost" size="sm" asChild className="gap-1.5 text-muted-foreground hover:text-foreground">
      <Link href={href}>
        <CircleHelp className="size-4" />
        사용법
      </Link>
    </Button>
  );
}
