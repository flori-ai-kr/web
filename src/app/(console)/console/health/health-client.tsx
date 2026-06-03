'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { getAiHealth } from '@/lib/actions/admin-health';
import type { AiHealthResponse } from '@/types/admin';

export function HealthClient({ initial }: { initial: AiHealthResponse }) {
  const [health, setHealth] = useState(initial);
  const [pending, startTransition] = useTransition();
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-foreground">서비스 상태</h2>
        <Button
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              try {
                setHealth(await getAiHealth());
              } catch (e) {
                toast.error(e instanceof Error ? e.message : '헬스 조회 실패');
              }
            })
          }
        >
          새로고침
        </Button>
      </div>
      {health.targets.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card px-4 py-8 text-center text-sm text-muted-foreground">
          설정된 헬스 타깃이 없습니다 (AI_HEALTH_* 환경변수 미설정).
        </div>
      ) : (
        <ul className="space-y-2">
          {health.targets.map((t) => {
            const up = t.status === 'UP';
            return (
              <li
                key={t.name}
                className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3"
              >
                <span className="font-medium text-foreground">{t.name}</span>
                <span
                  className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-[12px] font-semibold ${
                    up ? 'bg-success-soft text-success' : 'bg-destructive/10 text-destructive'
                  }`}
                >
                  <span className="h-[7px] w-[7px] rounded-full bg-current" />
                  {t.status}
                  {t.latencyMs != null ? ` · ${t.latencyMs}ms` : ''}
                  {t.detail ? ` · ${t.detail}` : ''}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
