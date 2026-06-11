'use client';

import {useState, useTransition} from 'react';
import {useRouter} from 'next/navigation';
import {NotebookPen} from 'lucide-react';
import {toast} from 'sonner';
import {updateScrapMemo} from '@/lib/actions/scraps';
import {ScrapButton} from './scrap-button';
import type {ScrapTargetType} from '@/types/database';

interface ScrapMemoEditorProps {
  targetType: ScrapTargetType;
  targetId: string;
  initialScraped: boolean;
  initialMemo: string | null;
}

export function ScrapMemoEditor(props: ScrapMemoEditorProps) {
  // targetId 변경 시 내부 state를 자동 초기화하기 위해 key로 리마운트
  return <ScrapMemoEditorInner key={props.targetId} {...props} />;
}

function ScrapMemoEditorInner({
  targetType,
  targetId,
  initialScraped,
  initialMemo,
}: ScrapMemoEditorProps) {
  const router = useRouter();
  const [scraped, setScraped] = useState(initialScraped);
  const [memo, setMemo] = useState(initialMemo ?? '');
  const [savedMemo, setSavedMemo] = useState(initialMemo ?? '');
  const [isPending, startTransition] = useTransition();

  const handleScrapChange = (next: boolean) => {
    setScraped(next);
    // 스크랩 해제 시 메모도 즉시 클리어 (서버에서도 레코드가 삭제됨)
    if (!next) {
      setMemo('');
      setSavedMemo('');
    }
  };

  const handleSave = () => {
    if (!scraped) {
      toast.info('먼저 스크랩한 후 메모를 저장할 수 있어요');
      return;
    }
    if (memo === savedMemo) return;
    if (isPending) return;

    startTransition(async () => {
      try {
        await updateScrapMemo({
          target_type: targetType,
          target_id: targetId,
          memo: memo || null,
        });
        setSavedMemo(memo);
        toast.success('메모를 저장했어요');
        router.refresh();
      } catch {
        toast.error('메모 저장에 실패했어요');
      }
    });
  };

  return (
    <div className="rounded-xl border border-border bg-card/50 p-4 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <NotebookPen className="w-4 h-4 text-brand" aria-hidden />
          내 메모
        </div>
        <ScrapButton
          targetType={targetType}
          targetId={targetId}
          scraped={scraped}
          label={scraped ? '스크랩됨' : '스크랩'}
          onChange={handleScrapChange}
        />
      </div>
      <textarea
        value={memo}
        onChange={(e) => setMemo(e.target.value)}
        onBlur={handleSave}
        placeholder={
          scraped
            ? '이 인사이트에 대한 메모를 남겨보세요 (포커스 해제 시 자동 저장)'
            : '스크랩하면 메모를 남길 수 있어요'
        }
        disabled={!scraped}
        rows={3}
        maxLength={1000}
        className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-brand focus:outline-none disabled:cursor-not-allowed disabled:bg-muted/30 disabled:opacity-70"
      />
      {scraped && memo !== savedMemo && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>저장되지 않은 변경사항</span>
          <button
            type="button"
            onClick={handleSave}
            disabled={isPending}
            className="px-2.5 py-1 rounded-md bg-brand text-white text-xs font-medium hover:bg-brand/90 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isPending ? '저장 중...' : '저장'}
          </button>
        </div>
      )}
    </div>
  );
}
