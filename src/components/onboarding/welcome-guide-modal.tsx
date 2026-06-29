'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { BookOpen, PartyPopper } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

// 첫 진입 1회만 노출되는 환영 가이드. localStorage 플래그로 '처음' 판별(서버 불필요).
const SEEN_KEY = 'flori_welcome_guide_seen';

export function WelcomeGuideModal() {
  const [open, setOpen] = useState(false);

  // 서버 스냅샷은 항상 닫힘 → 하이드레이션 일치. 마운트 후 미열람 시에만 연다.
  useEffect(() => {
    try {
      if (localStorage.getItem(SEEN_KEY) !== '1') setOpen(true); // eslint-disable-line react-hooks/set-state-in-effect -- mount 시 1회 로컬 플래그 확인
    } catch {
      // 프라이빗 모드 등 접근 불가 시 그냥 표시 안 함
    }
  }, []);

  const dismiss = () => {
    try {
      localStorage.setItem(SEEN_KEY, '1');
    } catch {
      // noop
    }
    setOpen(false);
  };

  return (
    // 바깥 클릭·ESC·X로는 닫히지 않게 막고, 아래 두 선택지로만 닫는다.
    <Dialog open={open}>
      <DialogContent
        showCloseButton={false}
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        className="gap-5 p-8 sm:max-w-xl"
      >
        <DialogHeader>
          <div className="mx-auto mb-2 flex h-16 w-16 items-center justify-center rounded-full bg-brand-muted">
            <PartyPopper className="h-8 w-8 text-brand" aria-hidden="true" />
          </div>
          <DialogTitle className="text-center text-2xl">flori에 오신 걸 환영해요!</DialogTitle>
          <DialogDescription className="text-center break-keep">
            처음이시라면 이용 가이드부터 둘러보세요.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-2 flex flex-col items-center gap-3">
          <Button asChild size="lg" className="h-12 w-full text-base font-semibold shadow-sm" onClick={dismiss}>
            <Link href="/admin/guide">
              <BookOpen className="h-4 w-4" aria-hidden="true" />
              이용 가이드 보기
            </Link>
          </Button>
          <button
            type="button"
            onClick={dismiss}
            className="text-xs text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
          >
            가이드 없이 바로 시작하기
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
