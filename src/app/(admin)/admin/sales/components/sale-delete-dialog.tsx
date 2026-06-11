'use client';

import {format} from 'date-fns';

import {Button} from '@/components/ui/button';
import {Dialog, DialogContent, DialogHeader, DialogTitle} from '@/components/ui/dialog';
import {ko} from '@/lib/date-locale';
import {formatCurrency} from '@/lib/utils';
import type {Sale} from '@/types/database';

/**
 * 매출 삭제 확인 모달. sales-client에서 이동.
 */
export function SaleDeleteDialog({
  target,
  onClose,
  onConfirm,
}: {
  target: Sale | null;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={!!target} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>매출 삭제</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <p className="text-muted-foreground text-sm">
            이 매출 기록을 삭제하시겠습니까?
          </p>
          {target && (
            <p className="text-muted-foreground text-xs mt-2">
              {format(new Date(target.date), 'M월 d일', { locale: ko })} · {formatCurrency(target.amount)}
            </p>
          )}
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            취소
          </Button>
          <Button variant="destructive" onClick={onConfirm}>
            삭제
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
