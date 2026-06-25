'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { sendTestNotification } from '@/lib/actions/push';
import { PUSH_TYPE_META } from '@/lib/push-types';

// 콘솔 테스트 노출 타입(공지 포함) + 기본 테스트.
const TEST_TYPES = [...Object.keys(PUSH_TYPE_META), 'test'];
const TYPE_LABEL: Record<string, string> = {
  ...Object.fromEntries(Object.entries(PUSH_TYPE_META).map(([k, v]) => [k, v.label])),
  test: '기본 테스트',
};
const TYPE_DESC: Record<string, string> = {
  ...Object.fromEntries(Object.entries(PUSH_TYPE_META).map(([k, v]) => [k, v.desc])),
  test: '푸시 동작 확인용 단순 알림',
};

export function NotificationsClient() {
  const [pendingType, setPendingType] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const send = (type: string) => {
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
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold text-foreground">알림 테스트</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          현재 적용된 템플릿으로 내 기기에 샘플 푸시를 발송합니다. 이 브라우저 계정에 푸시 구독이 켜져 있어야 하며,
          구독은 점주 설정(<span className="font-mono text-xs">/admin/settings</span>)에서 켤 수 있습니다.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {TEST_TYPES.map((type) => (
          <div
            key={type}
            className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-4"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">{TYPE_LABEL[type] ?? type}</p>
              <p className="text-xs text-muted-foreground">{TYPE_DESC[type] ?? ''}</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              disabled={pendingType !== null}
              onClick={() => send(type)}
            >
              {pendingType === type ? '발송 중…' : '발송'}
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
