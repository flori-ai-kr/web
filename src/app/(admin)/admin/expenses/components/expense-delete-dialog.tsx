'use client';

import {format} from 'date-fns';

import {Button} from '@/components/ui/button';
import {Dialog, DialogContent, DialogHeader, DialogTitle} from '@/components/ui/dialog';
import {ko} from '@/lib/date-locale';
import {formatCurrency} from '@/lib/utils';
import type {Expense} from '@/types/database';

/**
 * 지출 삭제 확인 모달. 고정비 자동생성 건은 '이것만/이후 모두' 분기를 제공한다.
 */
export function ExpenseDeleteDialog({
  target,
  onClose,
  onConfirm,
}: {
  target: Expense | null;
  onClose: () => void;
  onConfirm: (scope?: 'instance' | 'future') => void;
}) {
  return (
    <Dialog open={!!target} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{target?.recurring_id ? '반복되는 지출입니다' : '지출 삭제'}</DialogTitle>
        </DialogHeader>
        <div className="py-2">
          {target && (
            <p className="text-muted-foreground text-xs mb-3">
              {format(new Date(target.date), 'M월 d일', { locale: ko })} · {target.item_name} · {formatCurrency(target.total_amount)}
            </p>
          )}
          <p className="text-muted-foreground text-sm">
            {target?.recurring_id
              ? '고정비 자동생성으로 등록된 지출이에요. 어떻게 삭제할까요?'
              : '이 지출 기록을 삭제하시겠습니까?'}
          </p>
        </div>
        {target?.recurring_id ? (
          <div className="flex flex-col gap-2">
            <Button variant="destructive" onClick={() => onConfirm('instance')}>
              이 항목만 삭제
            </Button>
            <Button variant="destructive" onClick={() => onConfirm('future')}>
              이후 모두 삭제
            </Button>
            <Button variant="outline" onClick={onClose}>
              취소
            </Button>
          </div>
        ) : (
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>취소</Button>
            <Button variant="destructive" onClick={() => onConfirm()}>
              삭제
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
