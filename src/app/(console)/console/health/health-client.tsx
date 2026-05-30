'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { getAiHealth } from '@/lib/actions/admin-health';
import type { AiHealthResponse } from '@/types/admin';

export function HealthClient({ initial }: { initial: AiHealthResponse }) {
  const [health, setHealth] = useState(initial);
  const [pending, startTransition] = useTransition();
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">AI 헬스</h1>
        <Button
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={() => startTransition(async () => setHealth(await getAiHealth()))}
        >
          새로고침
        </Button>
      </div>
      {health.targets.length === 0 ? (
        <p className="text-sm text-zinc-500">
          설정된 헬스 타깃이 없습니다 (AI_HEALTH_* 환경변수 미설정).
        </p>
      ) : (
        <ul className="space-y-2">
          {health.targets.map((t) => (
            <li
              key={t.name}
              className="flex items-center justify-between rounded border border-zinc-800 bg-zinc-900 px-4 py-3"
            >
              <span className="font-medium">{t.name}</span>
              <span className={t.status === 'UP' ? 'text-emerald-400' : 'text-red-400'}>
                {t.status}
                {t.latencyMs != null ? ` · ${t.latencyMs}ms` : ''}
                {t.detail ? ` · ${t.detail}` : ''}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
