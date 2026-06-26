'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { backTarget } from '@/lib/guide/from-feature';
import { Button } from '@/components/ui/button';

export function GuideBackButton() {
  const params = useSearchParams();
  const from = params.get('from');
  const target = backTarget(from);

  if (!target) return null;

  return (
    <Button variant="ghost" size="sm" asChild className="gap-1.5 text-muted-foreground">
      <Link href={target.href}>
        <ArrowLeft className="size-4" />
        {target.label}로 돌아가기
      </Link>
    </Button>
  );
}
