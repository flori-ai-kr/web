'use client';

import {useEffect, useRef} from 'react';
import {useRouter} from 'next/navigation';
import {Loader2} from 'lucide-react';
import {changeCard} from '@/lib/actions/billing';

interface Props {
  authKey: string;
  customerKey: string;
}

/**
 * 카드 교체 복귀 처리.
 * changeCard()는 revalidatePath를 포함하므로 Server Component 렌더 중 호출 불가
 * (Task 2 success 플로우와 동일한 함정). useEffect 마운트 시점에 한 번만 실행한다.
 * 성공 시 설정 페이지로 replace → 구독·결제 카드가 재패칭되어 새 카드를 표시한다.
 */
export function ChangeCardClient({authKey, customerKey}: Props) {
  const router = useRouter();
  const calledRef = useRef(false);

  useEffect(() => {
    if (calledRef.current) return;
    calledRef.current = true;

    (async () => {
      try {
        await changeCard(authKey, customerKey);
        router.replace('/admin/settings');
      } catch {
        router.replace(`/billing/fail?code=CHANGE_CARD_FAILED&message=${encodeURIComponent('카드 교체에 실패했어요')}`);
      }
    })();
  }, [authKey, customerKey, router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[300px] gap-4 text-center">
      <Loader2 className="w-10 h-10 animate-spin text-brand" />
      <p className="text-sm text-muted-foreground">카드를 교체하고 있어요…</p>
    </div>
  );
}
