'use client';

import {useEffect, useState} from 'react';
import {Loader2, Plus, Save, Sparkles, Trash2} from 'lucide-react';
import {toast} from 'sonner';
import {Button} from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {Textarea} from '@/components/ui/textarea';
import {getToneProfile, saveToneProfile} from '@/lib/actions/marketing';
import {AppError} from '@/lib/errors';

const MAX_SAMPLES = 3;
const MAX_LEN = 4000;

/**
 * 말투 등록 — 내 블로그 글 1~3개를 붙여넣으면 다음 초안부터 그 말투로 작성된다.
 * 게이트웨이 tone_profile에 upsert. 빈 슬롯은 저장 시 제거.
 */
export function ToneProfileCard() {
  const [samples, setSamples] = useState<string[]>(['']);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    getToneProfile()
      .then((profile) => {
        if (!active) return;
        setSamples(profile.samples.length > 0 ? profile.samples : ['']);
      })
      .catch(() => {
        // 조회 실패는 빈 입력으로 시작(치명적 아님)
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  function update(index: number, value: string) {
    setSamples((prev) => prev.map((s, i) => (i === index ? value.slice(0, MAX_LEN) : s)));
  }

  function addSlot() {
    setSamples((prev) => (prev.length < MAX_SAMPLES ? [...prev, ''] : prev));
  }

  function removeSlot(index: number) {
    setSamples((prev) => {
      const next = prev.filter((_, i) => i !== index);
      return next.length > 0 ? next : [''];
    });
  }

  async function save() {
    const cleaned = samples.map((s) => s.trim()).filter((s) => s.length > 0);
    setSaving(true);
    try {
      const result = await saveToneProfile({samples: cleaned});
      setSamples(result.samples.length > 0 ? result.samples : ['']);
      toast.success(
        cleaned.length > 0 ? '말투를 저장했어요. 다음 초안부터 적용돼요.' : '말투 샘플을 모두 비웠어요.',
      );
    } catch (err) {
      toast.error(err instanceof AppError ? err.message : '말투 저장에 실패했어요.');
    } finally {
      setSaving(false);
    }
  }

  const filledCount = samples.filter((s) => s.trim().length > 0).length;

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2.5">
        <span
          className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
          style={{background: 'linear-gradient(135deg,var(--ai-grad-from),var(--ai-grad-to))'}}
          aria-hidden="true"
        >
          <Sparkles className="h-4 w-4 text-white" />
        </span>
        <div>
          <h3 className="text-sm font-semibold text-foreground">블로그 말투 설정</h3>
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
            사장님이 쓴 블로그 글을 1~3개 붙여넣으면, AI가 그 말투를 학습해 비슷한 톤으로 초안을 써요. 저장된 말투는
            초안을 만들 때 자동으로 적용됩니다.
          </p>
        </div>
      </div>

        {loading ? (
          <div className="space-y-2">
            <div className="h-20 w-full animate-pulse rounded-md bg-muted" />
          </div>
        ) : (
          <div className="space-y-3">
            {samples.map((sample, i) => (
              <div key={i} className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-muted-foreground" htmlFor={`tone-sample-${i}`}>
                    글 샘플 {i + 1}
                  </label>
                  {(samples.length > 1 || sample.trim().length > 0) && (
                    <button
                      type="button"
                      onClick={() => (sample.trim().length > 0 ? setDeleteIndex(i) : removeSlot(i))}
                      className="flex items-center gap-1 text-[11px] text-muted-foreground transition-colors hover:text-destructive"
                      aria-label={`글 샘플 ${i + 1} 삭제`}
                    >
                      <Trash2 className="h-3 w-3" />
                      삭제
                    </button>
                  )}
                </div>
                <Textarea
                  id={`tone-sample-${i}`}
                  value={sample}
                  onChange={(e) => update(i, e.target.value)}
                  placeholder="예) 안녕하세요, 오늘은 어버이날을 앞두고 카네이션 꽃다발을 준비해봤어요…"
                  className="min-h-[96px] resize-y text-sm"
                  maxLength={MAX_LEN}
                />
                <p className="text-right text-[11px] text-muted-foreground tabular-nums">
                  {sample.length.toLocaleString()} / {MAX_LEN.toLocaleString()}
                </p>
              </div>
            ))}

            <div className="flex items-center justify-between">
              {samples.length < MAX_SAMPLES ? (
                <Button type="button" variant="ghost" size="sm" onClick={addSlot} className="gap-1.5">
                  <Plus className="h-4 w-4" />
                  샘플 추가
                </Button>
              ) : (
                <span className="text-[11px] text-muted-foreground">최대 {MAX_SAMPLES}개까지</span>
              )}
              <Button type="button" variant="brand" size="sm" onClick={save} disabled={saving} className="gap-1.5">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {filledCount > 0 ? `말투 저장 (${filledCount})` : '저장'}
              </Button>
            </div>
          </div>
        )}

      <Dialog open={deleteIndex !== null} onOpenChange={(o) => !o && setDeleteIndex(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>글 샘플을 삭제할까요?</DialogTitle>
            <DialogDescription>붙여넣은 글 샘플이 삭제됩니다. 저장하면 적용돼요.</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteIndex(null)}>
              취소
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (deleteIndex !== null) removeSlot(deleteIndex);
                setDeleteIndex(null);
              }}
            >
              삭제
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
