'use client';

import {format} from 'date-fns';
import {Pencil, Trash2} from 'lucide-react';

import {Button} from '@/components/ui/button';
import {Dialog, DialogContent, DialogHeader, DialogTitle} from '@/components/ui/dialog';
import {ko} from '@/lib/date-locale';
import {formatCurrency} from '@/lib/utils';
import type {Expense} from '@/types/database';

/**
 * 지출 상세 모달. 수정/삭제 진입점.
 */
export function ExpenseDetailDialog({
  expense,
  onClose,
  onEdit,
  onDelete,
}: {
  expense: Expense | null;
  onClose: () => void;
  onEdit: (expense: Expense) => void;
  onDelete: (expense: Expense) => void;
}) {
  return (
    <Dialog open={!!expense} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl">지출 상세</DialogTitle>
        </DialogHeader>
        {expense && (
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">날짜</p>
                <p className="font-medium">{format(new Date(expense.date), 'yyyy년 M월 d일', { locale: ko })}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">총액</p>
                <p className="font-bold text-lg text-brand">{formatCurrency(expense.total_amount)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">물품명</p>
                <p className="font-medium">{expense.item_name}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">카테고리</p>
                <p className="font-medium">{expense.category_label ?? '미분류'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">결제방식</p>
                <p className="font-medium">{expense.payment_method_label ?? ''}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">단가 x 수량 = 총액</p>
                <p className="font-medium">{formatCurrency(expense.unit_price)} x {expense.quantity} = {formatCurrency(expense.total_amount)}</p>
              </div>
            </div>

            {expense.vendor && (
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">거래처</p>
                <p className="font-medium">{expense.vendor}</p>
              </div>
            )}

            {expense.memo && (
              <div className="space-y-1 pt-2 border-t">
                <p className="text-sm text-muted-foreground">메모</p>
                <p className="text-foreground">{expense.memo}</p>
              </div>
            )}

            <div className="flex gap-2 pt-4 border-t">
              <Button variant="outline" className="flex-1" onClick={() => onEdit(expense)}>
                <Pencil className="w-4 h-4 mr-2" />
                수정
              </Button>
              <Button
                variant="outline"
                className="flex-1 text-danger hover:text-danger hover:bg-danger/10"
                onClick={() => onDelete(expense)}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                삭제
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
