'use client';

import { useState } from 'react';
import { Menu } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { GuideNav } from './guide-nav';
import type { GuideSectionWithArticles } from '@/lib/guide/types';

export function GuideNavSheet({ sections }: { sections: GuideSectionWithArticles[] }) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="가이드 목록 열기" className="lg:hidden">
          <Menu className="size-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72 overflow-y-auto">
        <SheetHeader className="mb-4">
          <SheetTitle className="text-base">사용 가이드</SheetTitle>
        </SheetHeader>
        <div onClick={() => setOpen(false)}>
          <GuideNav sections={sections} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
