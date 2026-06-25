'use client';

import { useEffect, useState, useTransition } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Switch } from '@/components/ui/switch';
import { getPushPreferences, setPushPreference, type PushPreference } from '@/lib/actions/push';
import { PUSH_TYPE_META } from '@/lib/push-types';

/** 푸시 구독이 켜진 상태에서 타입별 on/off. 기본 켜짐, 강제 타입(공지)은 목록에 없음. */
export function PushPreferences() {
  const [prefs, setPrefs] = useState<PushPreference[]>([]);
  const [loading, setLoading] = useState(true);
  const [, startTransition] = useTransition();

  useEffect(() => {
    getPushPreferences()
      .then(setPrefs)
      .catch(() => toast.error('알림 설정을 불러오지 못했습니다'))
      .finally(() => setLoading(false));
  }, []);

  const toggle = (type: string, enabled: boolean) => {
    setPrefs((prev) => prev.map((p) => (p.type === type ? { ...p, enabled } : p)));
    startTransition(async () => {
      const res = await setPushPreference(type, enabled);
      if (!res.success) {
        setPrefs((prev) => prev.map((p) => (p.type === type ? { ...p, enabled: !enabled } : p)));
        toast.error(res.error ?? '설정 저장에 실패했습니다');
      }
    });
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 pt-3 mt-3 border-t border-border text-xs text-muted-foreground">
        <Loader2 className="w-3.5 h-3.5 animate-spin" /> 알림 종류 불러오는 중…
      </div>
    );
  }

  return (
    <div className="pt-3 mt-3 border-t border-border">
      <p className="text-xs font-medium text-muted-foreground mb-2">알림 종류</p>
      <div className="space-y-1">
        {prefs.map((p) => {
          const meta = PUSH_TYPE_META[p.type];
          return (
            <div key={p.type} className="flex items-center justify-between py-1.5">
              <div className="min-w-0">
                <p className="text-sm text-foreground">{meta?.label ?? p.type}</p>
                {meta?.desc ? <p className="text-xs text-muted-foreground">{meta.desc}</p> : null}
              </div>
              <Switch
                checked={p.enabled}
                aria-label={`${meta?.label ?? p.type} ${p.enabled ? '끄기' : '켜기'}`}
                onCheckedChange={(c) => toggle(p.type, c)}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
