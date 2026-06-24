'use client';

import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { DatePicker } from '@/components/ui/date-picker';

export interface BanDraft {
  userId: string;
  reason: string;
  expiresAt: string;
}

const EMPTY: BanDraft = { userId: '', reason: '', expiresAt: '' };

export function BanDialog({
  open,
  prefillUserId,
  pending,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  /** "작성자 차단" 진입 시 미리 채울 userId */
  prefillUserId?: number | null;
  pending: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (userId: number, reason: string | null, expiresAt: string | null) => void;
}) {
  const [draft, setDraft] = useState<BanDraft>(EMPTY);

  useEffect(() => {
    if (open) {
      setDraft({ ...EMPTY, userId: prefillUserId ? String(prefillUserId) : '' });
    }
  }, [open, prefillUserId]);

  const submit = () => {
    const userId = Number(draft.userId);
    onSubmit(
      userId,
      draft.reason.trim() ? draft.reason.trim() : null,
      draft.expiresAt ? `${draft.expiresAt}T00:00:00Z` : null,
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>유저 차단</DialogTitle>
          <DialogDescription>
            커뮤니티 활동을 차단합니다. 만료일을 비우면 영구 차단됩니다.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-sm font-medium" htmlFor="ban-user-id">
              userId
            </label>
            <Input
              id="ban-user-id"
              type="number"
              inputMode="numeric"
              value={draft.userId}
              onChange={(e) => setDraft((d) => ({ ...d, userId: e.target.value }))}
              placeholder="유저 ID"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium" htmlFor="ban-reason">
              사유
            </label>
            <Textarea
              id="ban-reason"
              value={draft.reason}
              onChange={(e) => setDraft((d) => ({ ...d, reason: e.target.value }))}
              placeholder="차단 사유 (선택)"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">만료일 (선택)</label>
            <DatePicker
              value={draft.expiresAt}
              onChange={(d) => setDraft((s) => ({ ...s, expiresAt: d }))}
              placeholder="비우면 영구 차단"
            />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" disabled={pending} onClick={() => onOpenChange(false)}>
            취소
          </Button>
          <Button
            disabled={pending || !draft.userId.trim() || Number(draft.userId) <= 0}
            onClick={submit}
          >
            차단
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
