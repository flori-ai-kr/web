'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { requestStorageIncrease } from '@/lib/actions/storage';

interface StorageIncreaseDialogProps {
  open: boolean;
  onClose: () => void;
  onDone: () => void;
}

export function StorageIncreaseDialog({ open, onClose, onDone }: StorageIncreaseDialogProps) {
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    setSubmitting(true);
    try {
      await requestStorageIncrease(reason.trim() || undefined);
      toast.success('증설 요청을 접수했어요. 운영팀이 확인 후 처리합니다.');
      setReason('');
      onClose();
      onDone();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '요청에 실패했어요');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>저장 용량 증설 요청</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="increase-reason">요청 사유 (선택)</Label>
          <Textarea
            id="increase-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={1000}
            rows={4}
            placeholder="예: 사진이 많아 용량이 부족합니다"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            취소
          </Button>
          <Button onClick={submit} disabled={submitting}>
            {submitting ? '요청 중...' : '요청 보내기'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
