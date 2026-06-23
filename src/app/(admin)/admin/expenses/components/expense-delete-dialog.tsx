'use client';

import {format} from 'date-fns';

import {Button} from '@/components/ui/button';
import {Dialog, DialogContent, DialogHeader, DialogTitle} from '@/components/ui/dialog';
import {ko} from '@/lib/date-locale';
import {formatCurrency} from '@/lib/utils';
import type {Expense} from '@/types/database';

/**
 * 지출 삭제 확인 모달. 고정비 자동생성 건도 일반 지출과 동일하게 그 건만 삭제한다(분기 없음).
 */
export function ExpenseDeleteDialog({
  target,
  onClose,
  onConfirm,
}: {
  target: Expense | null;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={!!target} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>지출 삭제</DialogTitle>
        </DialogHeader>
        <div className="py-2">
          {target && (
            <p className="text-muted-foreground text-xs mb-3">
              {format(new Date(target.date), 'M월 d일', { locale: ko })} · {target.item_name} · {formatCurrency(target.total_amount)}
            </p>
          )}
          <p className="text-muted-foreground text-sm">이 지출 기록을 삭제하시겠습니까?</p>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>취소</Button>
          <Button variant="destructive" onClick={() => onConfirm()}>
            삭제
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
