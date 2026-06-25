'use client';

import { useState, useTransition } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { sendTestNotification, type PushTestType } from '@/lib/actions/push';
import { toast } from 'sonner';

const TEST_ITEMS: { type: PushTestType; label: string; desc: string }[] = [
  { type: 'pickup_reminder', label: '예약 리마인더', desc: '개별 예약 픽업 리마인더 (5분 간격 발송)' },
  { type: 'daily_summary', label: '일일 요약', desc: '당일 예약 요약 (매일 오전 8시 발송)' },
  { type: 'test', label: '기본 테스트', desc: '푸시 동작 확인용 단순 알림' },
];

/**
 * 푸시 알림 테스트 모달. 각 템플릿을 서버의 현재 적용 템플릿 기준으로 내 기기에 실발송한다.
 * (POST /push/test?type= → PushTemplates.forTestType)
 */
export function PushTestDialog() {
  const [open, setOpen] = useState(false);
  const [pendingType, setPendingType] = useState<PushTestType | null>(null);
  const [, startTransition] = useTransition();

  const send = (type: PushTestType) => {
    setPendingType(type);
    startTransition(async () => {
      const result = await sendTestNotification(type);
      if (result.success) {
        toast.success('테스트 알림 발송 완료');
      } else {
        toast.error(result.error ?? '발송 실패');
      }
      setPendingType(null);
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          알림 테스트
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>푸시 알림 테스트</DialogTitle>
          <DialogDescription>
            현재 적용된 템플릿으로 내 기기에 샘플 푸시를 발송합니다. 기기/브라우저에서 알림 구독이 켜져 있어야 합니다.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          {TEST_ITEMS.map((item) => (
            <div
              key={item.type}
              className="flex items-center justify-between gap-3 rounded-lg border border-border p-3"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">{item.label}</p>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                disabled={pendingType !== null}
                onClick={() => send(item.type)}
              >
                {pendingType === item.type ? '발송 중…' : '발송'}
              </Button>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
