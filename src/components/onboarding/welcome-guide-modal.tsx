'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { BookOpen, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
    <Dialog open={open} onOpenChange={(o) => !o && dismiss()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-brand-muted">
            <Sparkles className="h-6 w-6 text-brand" aria-hidden="true" />
          </div>
          <DialogTitle className="text-center">flori에 오신 걸 환영해요</DialogTitle>
          <DialogDescription className="text-center break-keep">
            매출·지출·고객·예약·사진첩을 한곳에서 관리할 수 있어요.
            <br />
            처음이시라면 이용 가이드부터 둘러보세요.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button asChild className="w-full" onClick={dismiss}>
            <Link href="/admin/guide">
              <BookOpen className="h-4 w-4" aria-hidden="true" />
              이용 가이드 보기
            </Link>
          </Button>
          <Button variant="ghost" className="w-full" onClick={dismiss}>
            바로 시작하기
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
